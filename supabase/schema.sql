-- Forms platform schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

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
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
  submitted_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table forms enable row level security;
alter table responses enable row level security;

-- Forms: owner-only CRUD
create policy "forms_select_owner" on forms
  for select using (auth.uid() = user_id);

-- Forms: anyone can read published forms (public fill page)
create policy "forms_select_public_published" on forms
  for select using (is_published = true);

create policy "forms_insert_owner" on forms
  for insert with check (auth.uid() = user_id);

create policy "forms_update_owner" on forms
  for update using (auth.uid() = user_id);

create policy "forms_delete_owner" on forms
  for delete using (auth.uid() = user_id);

-- Responses: anyone can insert (public form fill), owner can read
create policy "responses_insert_public" on responses
  for insert with check (true);

create policy "responses_select_owner" on responses
  for select using (
    exists (
      select 1 from forms
      where forms.id = responses.form_id
        and forms.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists forms_user_id_idx on forms(user_id);
create index if not exists responses_form_id_idx on responses(form_id);
