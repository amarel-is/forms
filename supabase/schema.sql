-- Forms platform schema
-- Run this in Supabase SQL Editor

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- FORMS table
-- ─────────────────────────────────────────────
create table if not exists forms (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  fields        jsonb not null default '[]'::jsonb,
  settings      jsonb not null default '{}'::jsonb,
  is_published  boolean not null default false,
  form_type     text not null default 'general',
  schema        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table forms add column if not exists form_type text not null default 'general';
alter table forms add column if not exists schema jsonb not null default '{}'::jsonb;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists forms_updated_at on forms;
create trigger forms_updated_at
  before update on forms
  for each row
  execute function update_updated_at_column();

-- ─────────────────────────────────────────────
-- RESPONSES table
-- ─────────────────────────────────────────────
create table if not exists responses (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references forms(id) on delete cascade,
  data          jsonb not null default '{}'::jsonb,
  device_id     text,
  submitted_at  timestamptz not null default now()
);

-- Per-device submission limiting (e.g. live one-time voting).
alter table responses add column if not exists device_id text;
create index if not exists responses_form_device_idx on responses (form_id, device_id);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS table
-- ─────────────────────────────────────────────
create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  form_id       uuid not null references forms(id) on delete cascade,
  form_name     text not null,
  response_id   uuid not null references responses(id) on delete cascade,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

create or replace function notify_form_owner_on_response()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  insert into notifications (user_id, form_id, form_name, response_id)
  select f.user_id, f.id, f.name, new.id
  from forms f
  where f.id = new.form_id;
  return new;
end;
$$;

drop trigger if exists on_new_response_notify on responses;
create trigger on_new_response_notify
  after insert on responses
  for each row
  execute function notify_form_owner_on_response();

-- ─────────────────────────────────────────────
-- EMAIL ALERTS ON NEW RESPONSE (Resend, per-form opt-in)
-- ─────────────────────────────────────────────
-- Secrets (RESEND_API_KEY + an internal shared secret) live in Supabase Vault,
-- never in this file or in migration history. Seeded once via:
--   select vault.create_secret('<key>', 'resend_api_key', '...');
--   select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'submission_email_internal_secret', '...');
create extension if not exists pg_net;

create or replace function get_decrypted_secret(secret_name text)
returns text
language sql
security definer
set search_path = 'public, vault'
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name;
$$;

revoke all on function get_decrypted_secret(text) from public, anon, authenticated;
grant execute on function get_decrypted_secret(text) to service_role;

-- Fires the `send-submission-email` Edge Function (supabase/functions/send-submission-email)
-- whenever forms.settings->>'email_alert_enabled' is true for the submitted form. The Edge
-- Function re-validates the setting, resolves recipients, and sends via Resend.
create or replace function notify_submission_email_alert()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_enabled boolean;
begin
  select coalesce((f.settings->>'email_alert_enabled')::boolean, false)
  into v_enabled
  from forms f
  where f.id = new.form_id;

  if v_enabled then
    perform net.http_post(
      url := 'https://eklcljkwdsfhsfjhezqk.supabase.co/functions/v1/send-submission-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', get_decrypted_secret('submission_email_internal_secret')
      ),
      body := jsonb_build_object('response_id', new.id, 'form_id', new.form_id),
      timeout_milliseconds := 10000
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_new_response_email_alert on responses;
create trigger on_new_response_email_alert
  after insert on responses
  for each row
  execute function notify_submission_email_alert();

-- ─────────────────────────────────────────────
-- PUBLIC SUBMISSION RPC
-- ─────────────────────────────────────────────
drop function if exists submit_response_public(uuid, jsonb);
create or replace function submit_response_public(
  p_form_id uuid,
  p_data jsonb,
  p_device_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_response_id    uuid;
  v_settings       jsonb;
  v_limit_mode     text;
  v_limit_field_id text;
  v_limit_count    integer;
  v_submitted_val  text;
  v_existing_count bigint;
  v_start_date     text;
  v_end_date       text;
  v_today_il       text;
begin
  -- Allow submission only for published forms, or by the form owner.
  if not exists (
    select 1
    from forms f
    where f.id = p_form_id
      and (f.is_published = true or f.user_id = auth.uid())
  ) then
    return null;
  end if;

  select f.settings into v_settings from forms f where f.id = p_form_id;

  -- Check submission date window (Israel time UTC+3).
  v_start_date := v_settings->>'submission_start_date';
  v_end_date   := v_settings->>'submission_end_date';
  v_today_il   := to_char(now() at time zone 'Asia/Jerusalem', 'YYYY-MM-DD');

  if v_start_date is not null and v_start_date <> '' and v_today_il < v_start_date then
    raise exception 'submission_not_yet_open';
  end if;

  if v_end_date is not null and v_end_date <> '' and v_today_il > v_end_date then
    raise exception 'submission_deadline_passed';
  end if;

  -- Check submission limit. Two modes:
  --   'device' — at most v_limit_count submissions per device fingerprint (no ID field; for live voting).
  --   'field'  — (default) at most v_limit_count per unique value of a chosen field.
  v_limit_mode     := coalesce(v_settings->>'submission_limit_mode', 'field');
  v_limit_count    := coalesce((v_settings->>'submission_limit_count')::integer, 1);

  if v_limit_mode = 'device' then
    if p_device_id is not null and p_device_id <> '' then
      select count(*) into v_existing_count
      from responses r
      where r.form_id = p_form_id
        and r.device_id = p_device_id;

      if v_existing_count >= v_limit_count then
        raise exception 'submission_limit_exceeded';
      end if;
    end if;
  else
    v_limit_field_id := v_settings->>'submission_limit_field_id';

    if v_limit_field_id is not null and v_limit_field_id <> '' then
      -- Extract the submitted value for the limit field (handle both scalar and array).
      if jsonb_typeof(p_data->v_limit_field_id) = 'array' then
        v_submitted_val := coalesce(p_data->v_limit_field_id->>0, '');
      else
        v_submitted_val := coalesce(p_data->>v_limit_field_id, '');
      end if;

      if v_submitted_val <> '' then
        select count(*) into v_existing_count
        from responses r
        where r.form_id = p_form_id
          and (
            case
              when jsonb_typeof(r.data->v_limit_field_id) = 'array'
                then r.data->v_limit_field_id->>0
              else r.data->>v_limit_field_id
            end
          ) = v_submitted_val;

        if v_existing_count >= v_limit_count then
          raise exception 'submission_limit_exceeded';
        end if;
      end if;
    end if;
  end if;

  insert into responses (form_id, data, device_id)
  values (p_form_id, coalesce(p_data, '{}'::jsonb), nullif(p_device_id, ''))
  returning id into v_response_id;

  return v_response_id;
end;
$$;

revoke all on function submit_response_public(uuid, jsonb, text) from public;
grant execute on function submit_response_public(uuid, jsonb, text) to anon, authenticated;

-- ─────────────────────────────────────────────
-- APPROVAL tables (form_type = 'approval')
-- ─────────────────────────────────────────────
create table if not exists response_approvals (
  id                  uuid primary key default gen_random_uuid(),
  response_id         uuid not null unique references responses(id) on delete cascade,
  form_id             uuid not null references forms(id) on delete cascade,
  status              text not null check (status in ('pending','in_progress','approved','rejected','expired')),
  current_step_index  integer not null default 0,
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists response_approval_steps (
  id                    uuid primary key default gen_random_uuid(),
  response_approval_id  uuid not null references response_approvals(id) on delete cascade,
  step_index            integer not null,
  approver_name         text not null,
  approver_channel      text not null check (approver_channel in ('email','whatsapp')),
  approver_target       text not null,
  status                text not null check (status in ('waiting','pending','approved','rejected','expired')),
  token_hash            text,
  token_expires_at      timestamptz,
  token_used_at         timestamptz,
  acted_at              timestamptz,
  signature_data        text,
  decision_note         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (response_approval_id, step_index)
);

create table if not exists response_approval_events (
  id                        uuid primary key default gen_random_uuid(),
  response_approval_id      uuid not null references response_approvals(id) on delete cascade,
  response_approval_step_id uuid references response_approval_steps(id) on delete set null,
  event_type                text not null,
  metadata                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now()
);

drop trigger if exists response_approvals_updated_at on response_approvals;
create trigger response_approvals_updated_at
  before update on response_approvals
  for each row execute function update_updated_at_column();

drop trigger if exists response_approval_steps_updated_at on response_approval_steps;
create trigger response_approval_steps_updated_at
  before update on response_approval_steps
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────────
-- APPROVAL RPCs
-- ─────────────────────────────────────────────

create or replace function initialize_approval_for_response(p_response_id uuid)
returns jsonb
language plpgsql security definer set search_path = 'public', 'extensions'
as $$
declare
  v_response  responses%rowtype;
  v_form      forms%rowtype;
  v_workflow  jsonb;
  v_steps     jsonb;
  v_approval_id uuid;
  v_step_id   uuid;
  v_step      jsonb;
  v_idx       integer;
  v_token     text;
  v_src_type  text;
  v_src_fid   text;
  v_src_val   text;
  v_tgt_map   jsonb;
  v_resolved  text;
begin
  select * into v_response from responses where id = p_response_id;
  if not found then
    return jsonb_build_object('created', false, 'reason', 'response_not_found');
  end if;

  if exists (select 1 from response_approvals where response_id = p_response_id) then
    return jsonb_build_object('created', false, 'reason', 'already_initialized');
  end if;

  select * into v_form from forms where id = v_response.form_id;

  if v_form.form_type <> 'approval' then
    return jsonb_build_object('created', false, 'reason', 'not_approval_form');
  end if;

  v_workflow := coalesce(v_form.settings->'approval_workflow', '{}'::jsonb);
  if not coalesce((v_workflow->>'enabled')::boolean, false) then
    return jsonb_build_object('created', false, 'reason', 'workflow_disabled');
  end if;

  v_steps := coalesce(v_workflow->'steps', '[]'::jsonb);
  if jsonb_typeof(v_steps) <> 'array' or jsonb_array_length(v_steps) = 0 then
    return jsonb_build_object('created', false, 'reason', 'no_steps');
  end if;

  insert into response_approvals (response_id, form_id, status, current_step_index, started_at)
  values (p_response_id, v_form.id, 'in_progress', 0, now())
  returning id into v_approval_id;

  for v_idx in 0..jsonb_array_length(v_steps) - 1 loop
    v_step := v_steps->v_idx;
    v_src_type := coalesce(v_step->>'source_type', 'fixed');
    v_src_fid  := coalesce(v_step->>'source_field_id', '');
    v_src_val  := '';
    v_resolved := '';

    if v_src_type = 'from_field' then
      if v_src_fid = '' then
        return jsonb_build_object('created', false, 'reason', 'missing_source_field', 'step_index', v_idx);
      end if;
      if jsonb_typeof(v_response.data->v_src_fid) = 'array' then
        v_resolved := coalesce(v_response.data->v_src_fid->>0, '');
      else
        v_resolved := coalesce(v_response.data->>v_src_fid, '');
      end if;
    elsif v_src_type = 'from_option_map' then
      if v_src_fid = '' then
        return jsonb_build_object('created', false, 'reason', 'missing_source_field', 'step_index', v_idx);
      end if;
      v_tgt_map := coalesce(v_step->'target_by_value', '{}'::jsonb);
      if jsonb_typeof(v_response.data->v_src_fid) = 'array' then
        v_src_val := coalesce(v_response.data->v_src_fid->>0, '');
      else
        v_src_val := coalesce(v_response.data->>v_src_fid, '');
      end if;
      v_resolved := coalesce(v_tgt_map->>v_src_val, v_tgt_map->>'*', '');
      if btrim(v_resolved) = '' then
        return jsonb_build_object('created', false, 'reason', 'missing_target_mapping', 'step_index', v_idx, 'source_value', v_src_val);
      end if;
    else
      v_resolved := coalesce(v_step->>'target', '');
    end if;

    if btrim(v_resolved) = '' then
      return jsonb_build_object('created', false, 'reason', 'empty_target', 'step_index', v_idx);
    end if;

    insert into response_approval_steps (
      response_approval_id, step_index, approver_name, approver_channel, approver_target, status
    ) values (
      v_approval_id, v_idx,
      coalesce(v_step->>'approver_name', ''),
      coalesce(v_step->>'channel', 'email'),
      v_resolved,
      case when v_idx = 0 then 'pending' else 'waiting' end
    ) returning id into v_step_id;

    if v_idx = 0 then
      v_token := encode(gen_random_bytes(24), 'hex');
      update response_approval_steps
      set token_hash = encode(digest(v_token, 'sha256'), 'hex'),
          token_expires_at = now() + interval '72 hours'
      where id = v_step_id;

      insert into response_approval_events (response_approval_id, response_approval_step_id, event_type, metadata)
      values (v_approval_id, v_step_id, 'token_issued',
        jsonb_build_object('step_index', v_idx, 'channel', coalesce(v_step->>'channel','email'), 'target', v_resolved));
    end if;
  end loop;

  insert into response_approval_events (response_approval_id, event_type, metadata)
  values (v_approval_id, 'approval_initialized', jsonb_build_object('steps_count', jsonb_array_length(v_steps)));

  return jsonb_build_object('created', true, 'approval_id', v_approval_id, 'first_token', v_token);
end;
$$;

create or replace function get_approval_by_token(p_token text)
returns table (
  response_approval_id uuid, response_approval_step_id uuid,
  form_id uuid, form_name text, form_fields jsonb, form_settings jsonb,
  response_id uuid, response_data jsonb,
  step_index integer, total_steps integer,
  approver_name text, approver_channel text, approver_target text,
  expires_at timestamptz
)
language plpgsql security definer set search_path = 'public', 'extensions'
as $$
begin
  return query
  with matched as (
    select s.*, a.form_id as a_form_id, a.response_id as a_response_id
    from response_approval_steps s
    join response_approvals a on a.id = s.response_approval_id
    where s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and s.status = 'pending'
      and s.token_used_at is null
      and s.token_expires_at is not null
      and s.token_expires_at > now()
  )
  select
    m.response_approval_id,
    m.id as response_approval_step_id,
    f.id as form_id,
    f.name as form_name,
    f.fields as form_fields,
    f.settings as form_settings,
    r.id as response_id,
    r.data as response_data,
    m.step_index,
    (select count(*) from response_approval_steps s2 where s2.response_approval_id = m.response_approval_id)::integer as total_steps,
    m.approver_name,
    m.approver_channel,
    m.approver_target,
    m.token_expires_at as expires_at
  from matched m
  join forms f on f.id = m.a_form_id
  join responses r on r.id = m.a_response_id;
end;
$$;

create or replace function decide_approval_by_token(
  p_token text, p_decision text, p_note text default null, p_signature text default null
)
returns jsonb
language plpgsql security definer set search_path = 'public', 'extensions'
as $$
declare
  v_step       response_approval_steps%rowtype;
  v_approval   response_approvals%rowtype;
  v_next_step  response_approval_steps%rowtype;
  v_next_token text;
begin
  if p_decision not in ('approved','rejected') then
    return jsonb_build_object('ok', false, 'error', 'invalid_decision');
  end if;

  select s.* into v_step
  from response_approval_steps s
  where s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and s.status = 'pending' and s.token_used_at is null
    and s.token_expires_at is not null and s.token_expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'token_invalid_or_expired');
  end if;

  select * into v_approval from response_approvals where id = v_step.response_approval_id for update;

  update response_approval_steps
  set status = p_decision, acted_at = now(), decision_note = p_note, signature_data = p_signature, token_used_at = now()
  where id = v_step.id;

  insert into response_approval_events (response_approval_id, response_approval_step_id, event_type, metadata)
  values (v_step.response_approval_id, v_step.id, 'step_decision',
    jsonb_build_object('decision', p_decision, 'step_index', v_step.step_index));

  if p_decision = 'rejected' then
    update response_approvals set status = 'rejected', finished_at = now() where id = v_step.response_approval_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  select * into v_next_step
  from response_approval_steps
  where response_approval_id = v_step.response_approval_id and step_index = v_step.step_index + 1
  for update;

  if not found then
    update response_approvals set status = 'approved', finished_at = now() where id = v_step.response_approval_id;
    return jsonb_build_object('ok', true, 'status', 'approved');
  end if;

  v_next_token := encode(gen_random_bytes(24), 'hex');

  update response_approval_steps
  set status = 'pending',
      token_hash = encode(digest(v_next_token, 'sha256'), 'hex'),
      token_expires_at = now() + interval '72 hours',
      token_used_at = null
  where id = v_next_step.id;

  update response_approvals set status = 'in_progress', current_step_index = v_next_step.step_index
  where id = v_step.response_approval_id;

  insert into response_approval_events (response_approval_id, response_approval_step_id, event_type, metadata)
  values (v_step.response_approval_id, v_next_step.id, 'token_issued',
    jsonb_build_object('step_index', v_next_step.step_index, 'channel', v_next_step.approver_channel, 'target', v_next_step.approver_target));

  return jsonb_build_object('ok', true, 'status', 'in_progress', 'next_step_index', v_next_step.step_index, 'next_token', v_next_token);
end;
$$;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table forms enable row level security;
alter table responses enable row level security;
alter table notifications enable row level security;
alter table response_approvals enable row level security;
alter table response_approval_steps enable row level security;
alter table response_approval_events enable row level security;

drop policy if exists "forms_select_owner" on forms;
create policy "forms_select_owner" on forms for select using (auth.uid() = user_id);
drop policy if exists "forms_select_public_published" on forms;
create policy "forms_select_public_published" on forms for select using (is_published = true);
drop policy if exists "forms_insert_owner" on forms;
create policy "forms_insert_owner" on forms for insert with check (auth.uid() = user_id);
drop policy if exists "forms_update_owner" on forms;
create policy "forms_update_owner" on forms for update using (auth.uid() = user_id);
drop policy if exists "forms_delete_owner" on forms;
create policy "forms_delete_owner" on forms for delete using (auth.uid() = user_id);

drop policy if exists "responses_insert_public" on responses;
create policy "responses_insert_public" on responses for insert with check (true);
drop policy if exists "responses_select_owner" on responses;
create policy "responses_select_owner" on responses for select using (
  exists (select 1 from forms where forms.id = responses.form_id and forms.user_id = auth.uid())
);
drop policy if exists "responses_select_insert_post" on responses;
create policy "responses_select_insert_post" on responses for select using (
  current_setting('request.method', true) = 'POST'
);
drop policy if exists "responses_delete_owner" on responses;
create policy "responses_delete_owner" on responses for delete using (
  exists (select 1 from forms where forms.id = responses.form_id and forms.user_id = auth.uid())
);

drop policy if exists "notifications_select_owner" on notifications;
create policy "notifications_select_owner" on notifications for select using (auth.uid() = user_id);
drop policy if exists "notifications_update_owner" on notifications;
create policy "notifications_update_owner" on notifications for update using (auth.uid() = user_id);
drop policy if exists "notifications_delete_owner" on notifications;
create policy "notifications_delete_owner" on notifications for delete using (auth.uid() = user_id);

drop policy if exists "response_approvals_select_owner" on response_approvals;
create policy "response_approvals_select_owner" on response_approvals for select using (
  exists (select 1 from forms where forms.id = response_approvals.form_id and forms.user_id = auth.uid())
);

drop policy if exists "response_approval_steps_select_owner" on response_approval_steps;
create policy "response_approval_steps_select_owner" on response_approval_steps for select using (
  exists (select 1 from response_approvals a join forms f on f.id = a.form_id
    where a.id = response_approval_steps.response_approval_id and f.user_id = auth.uid())
);

drop policy if exists "response_approval_events_select_owner" on response_approval_events;
create policy "response_approval_events_select_owner" on response_approval_events for select using (
  exists (select 1 from response_approvals a join forms f on f.id = a.form_id
    where a.id = response_approval_events.response_approval_id and f.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- WEBHOOK tables
-- ─────────────────────────────────────────────
create table if not exists form_webhooks (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references forms(id) on delete cascade,
  url         text not null,
  events      text[] not null default '{}',
  is_active   boolean not null default true,
  secret      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists form_webhooks_updated_at on form_webhooks;
create trigger form_webhooks_updated_at
  before update on form_webhooks
  for each row execute function update_updated_at_column();

create table if not exists webhook_logs (
  id            uuid primary key default gen_random_uuid(),
  webhook_id    uuid not null references form_webhooks(id) on delete cascade,
  form_id       uuid not null references forms(id) on delete cascade,
  event         text not null,
  payload       jsonb not null default '{}'::jsonb,
  status_code   integer,
  response_body text,
  error         text,
  created_at    timestamptz not null default now()
);

alter table form_webhooks enable row level security;
alter table webhook_logs enable row level security;

drop policy if exists "form_webhooks_select_owner" on form_webhooks;
create policy "form_webhooks_select_owner" on form_webhooks for select using (
  exists (select 1 from forms where forms.id = form_webhooks.form_id and forms.user_id = auth.uid())
);
drop policy if exists "form_webhooks_insert_owner" on form_webhooks;
create policy "form_webhooks_insert_owner" on form_webhooks for insert with check (
  exists (select 1 from forms where forms.id = form_webhooks.form_id and forms.user_id = auth.uid())
);
drop policy if exists "form_webhooks_update_owner" on form_webhooks;
create policy "form_webhooks_update_owner" on form_webhooks for update using (
  exists (select 1 from forms where forms.id = form_webhooks.form_id and forms.user_id = auth.uid())
);
drop policy if exists "form_webhooks_delete_owner" on form_webhooks;
create policy "form_webhooks_delete_owner" on form_webhooks for delete using (
  exists (select 1 from forms where forms.id = form_webhooks.form_id and forms.user_id = auth.uid())
);

drop policy if exists "webhook_logs_select_owner" on webhook_logs;
create policy "webhook_logs_select_owner" on webhook_logs for select using (
  exists (select 1 from forms where forms.id = webhook_logs.form_id and forms.user_id = auth.uid())
);
drop policy if exists "webhook_logs_insert_service" on webhook_logs;
create policy "webhook_logs_insert_service" on webhook_logs for insert with check (true);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists forms_user_id_idx on forms(user_id);
create index if not exists responses_form_id_idx on responses(form_id);
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_form_id_idx on notifications(form_id);
create index if not exists response_approvals_form_id_idx on response_approvals(form_id);
create index if not exists response_approvals_response_id_idx on response_approvals(response_id);
create index if not exists response_approval_steps_approval_id_idx on response_approval_steps(response_approval_id);
create index if not exists response_approval_steps_token_hash_idx on response_approval_steps(token_hash);
create index if not exists response_approval_events_approval_id_idx on response_approval_events(response_approval_id);
create index if not exists form_webhooks_form_id_idx on form_webhooks(form_id);
create index if not exists webhook_logs_webhook_id_idx on webhook_logs(webhook_id);
create index if not exists webhook_logs_form_id_idx on webhook_logs(form_id);
create index if not exists webhook_logs_created_at_idx on webhook_logs(created_at desc);

-- ─────────────────────────────────────────────
-- RESULT SHARE LINKS — public, filtered views of a form's responses
-- Public reads go through the service-role client on the server only
-- (no anon policy); owners manage their links under RLS.
-- ─────────────────────────────────────────────
create table if not exists result_share_links (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references forms(id) on delete cascade,
  token            text not null unique,
  name             text not null,
  filter_field_id  text not null,
  filter_values    text[] not null default '{}',
  column_ids       text[] not null default '{}',
  allow_download   boolean not null default true,
  is_active        boolean not null default true,
  expires_at       date,
  password_hash    text,
  view_count       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists result_share_links_updated_at on result_share_links;
create trigger result_share_links_updated_at
  before update on result_share_links
  for each row execute function update_updated_at_column();

create index if not exists result_share_links_form_id_idx on result_share_links(form_id);

alter table result_share_links enable row level security;

drop policy if exists "result_share_links_select_owner" on result_share_links;
create policy "result_share_links_select_owner" on result_share_links for select using (
  exists (select 1 from forms where forms.id = result_share_links.form_id and forms.user_id = auth.uid())
);
drop policy if exists "result_share_links_insert_owner" on result_share_links;
create policy "result_share_links_insert_owner" on result_share_links for insert with check (
  exists (select 1 from forms where forms.id = result_share_links.form_id and forms.user_id = auth.uid())
);
drop policy if exists "result_share_links_update_owner" on result_share_links;
create policy "result_share_links_update_owner" on result_share_links for update using (
  exists (select 1 from forms where forms.id = result_share_links.form_id and forms.user_id = auth.uid())
);
drop policy if exists "result_share_links_delete_owner" on result_share_links;
create policy "result_share_links_delete_owner" on result_share_links for delete using (
  exists (select 1 from forms where forms.id = result_share_links.form_id and forms.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- RESPONSE EDITS — audit log for edited / deleted submissions
-- Every change to responses.data (dashboard edit, restore, external API PATCH)
-- and every delete is snapshotted here by trigger, so no answer is ever lost.
-- response_id intentionally has no FK: the log must outlive a deleted response.
-- ─────────────────────────────────────────────
create table if not exists response_edits (
  id               uuid primary key default gen_random_uuid(),
  response_id      uuid not null,
  form_id          uuid not null references forms(id) on delete cascade,
  action           text not null check (action in ('update', 'delete')),
  source           text not null default 'dashboard' check (source in ('dashboard', 'restore', 'api')),
  old_data         jsonb,
  new_data         jsonb,
  changed_keys     text[] not null default '{}',
  edited_by        uuid,
  edited_by_email  text,
  created_at       timestamptz not null default now()
);

create index if not exists response_edits_response_idx on response_edits (response_id, created_at desc);
create index if not exists response_edits_form_idx on response_edits (form_id, created_at desc);

alter table response_edits enable row level security;

drop policy if exists "response_edits_select_owner" on response_edits;
create policy "response_edits_select_owner" on response_edits for select using (
  exists (select 1 from forms where forms.id = response_edits.form_id and forms.user_id = auth.uid())
);
-- No insert/update/delete policies: rows are written only by the trigger below
-- and are immutable from the app.

create or replace function log_response_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_editor  uuid := coalesce(nullif(current_setting('app.editor_id', true), '')::uuid, auth.uid());
  v_email   text := coalesce(nullif(current_setting('app.editor_email', true), ''), auth.jwt() ->> 'email');
  v_source  text := coalesce(
                      nullif(current_setting('app.edit_source', true), ''),
                      case when v_editor is null then 'api' else 'dashboard' end
                    );
  v_keys    text[];
begin
  if tg_op = 'UPDATE' then
    if new.data is not distinct from old.data then
      return new;
    end if;
    select coalesce(array_agg(k order by k), '{}') into v_keys
    from (
      select key as k from jsonb_each(coalesce(old.data, '{}'::jsonb))
      union
      select key from jsonb_each(coalesce(new.data, '{}'::jsonb))
    ) all_keys
    where (old.data -> k) is distinct from (new.data -> k);

    insert into response_edits (response_id, form_id, action, source, old_data, new_data, changed_keys, edited_by, edited_by_email)
    values (old.id, old.form_id, 'update', v_source, old.data, new.data, v_keys, v_editor, v_email);
    return new;
  end if;

  -- DELETE: skip when the whole form is being deleted (cascade) — nothing to keep it under.
  if exists (select 1 from forms where id = old.form_id) then
    insert into response_edits (response_id, form_id, action, source, old_data, new_data, changed_keys, edited_by, edited_by_email)
    values (old.id, old.form_id, 'delete', v_source, old.data, null, '{}', v_editor, v_email);
  end if;
  return old;
end;
$$;

drop trigger if exists on_response_change_audit on responses;
create trigger on_response_change_audit
  after update or delete on responses
  for each row execute function log_response_change();

-- Edit a submission from the dashboard. Merges p_patch into the stored data
-- (or replaces it entirely when restoring a version), tags the audit row with
-- the editor, and returns the new data. Owners call it with their own session;
-- superadmins call it via the service role and pass p_editor_* explicitly.
create or replace function update_response_data(
  p_response_id   uuid,
  p_form_id       uuid,
  p_patch         jsonb,
  p_source        text default 'dashboard',
  p_editor_id     uuid default null,
  p_editor_email  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_service boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
  v_editor     uuid := case when v_is_service then p_editor_id else auth.uid() end;
  v_email      text := case when v_is_service then p_editor_email else auth.jwt() ->> 'email' end;
  v_data       jsonb;
begin
  if p_source not in ('dashboard', 'restore') then
    raise exception 'invalid_source';
  end if;
  if jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'invalid_patch';
  end if;
  if not v_is_service and not exists (
    select 1 from forms where id = p_form_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  perform set_config('app.editor_id', coalesce(v_editor::text, ''), true);
  perform set_config('app.editor_email', coalesce(v_email, ''), true);
  perform set_config('app.edit_source', p_source, true);

  update responses
     set data = case when p_source = 'restore' then p_patch else coalesce(data, '{}'::jsonb) || p_patch end
   where id = p_response_id and form_id = p_form_id
  returning data into v_data;

  if v_data is null then
    raise exception 'not_found';
  end if;
  return v_data;
end;
$$;

revoke all on function update_response_data(uuid, uuid, jsonb, text, uuid, text) from public, anon;
grant execute on function update_response_data(uuid, uuid, jsonb, text, uuid, text) to authenticated, service_role;
