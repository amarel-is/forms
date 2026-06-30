"use server"

import { getAuthContext } from "@/lib/supabase/auth-context"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildWebhookEnrichment } from "@/lib/webhook-enrich"
import { rowToForm, isLayoutField, type FieldConfig } from "@/lib/types"
import crypto from "crypto"

export interface FormWebhook {
  id: string
  form_id: string
  url: string
  events: string[]
  is_active: boolean
  secret: string | null
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  webhook_id: string
  form_id: string
  event: string
  payload: Record<string, unknown>
  status_code: number | null
  response_body: string | null
  error: string | null
  created_at: string
}

export async function getFormWebhooks(formId: string): Promise<{
  webhooks: FormWebhook[]
  error?: string
}> {
  // Superadmin uses the service-role client → can manage any form's webhooks
  // (org-wide oversight); regular users stay bound by RLS to their own forms.
  const { user, db } = await getAuthContext()
  if (!user) return { webhooks: [], error: "Unauthorized" }
  const { data, error } = await db
    .from("form_webhooks")
    .select("*")
    .eq("form_id", formId)
    .order("created_at", { ascending: true })

  if (error) return { webhooks: [], error: error.message }
  return { webhooks: (data ?? []) as FormWebhook[] }
}

export async function upsertWebhook(params: {
  id?: string
  form_id: string
  url: string
  events: string[]
  is_active: boolean
  secret?: string | null
}): Promise<{ webhook?: FormWebhook; error?: string }> {
  const { user, db: sb } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }

  if (params.id) {
    const { data, error } = await sb
      .from("form_webhooks")
      .update({
        url: params.url,
        events: params.events,
        is_active: params.is_active,
        ...(params.secret !== undefined ? { secret: params.secret } : {}),
      })
      .eq("id", params.id)
      .select("*")
      .single()

    if (error) return { error: error.message }
    return { webhook: data as FormWebhook }
  }

  const secret = crypto.randomBytes(32).toString("hex")
  const { data, error } = await sb
    .from("form_webhooks")
    .insert({
      form_id: params.form_id,
      url: params.url,
      events: params.events,
      is_active: params.is_active,
      secret,
    })
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { webhook: data as FormWebhook }
}

export async function deleteWebhook(webhookId: string): Promise<{ error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }
  const { error } = await db
    .from("form_webhooks")
    .delete()
    .eq("id", webhookId)

  if (error) return { error: error.message }
  return {}
}

export async function getWebhookLogs(formId: string, limit = 50): Promise<{
  logs: WebhookLog[]
  error?: string
}> {
  const { user, db } = await getAuthContext()
  if (!user) return { logs: [], error: "Unauthorized" }
  const { data, error } = await db
    .from("webhook_logs")
    .select("*")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return { logs: [], error: error.message }
  return { logs: (data ?? []) as WebhookLog[] }
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

export async function fireWebhooks(
  formId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  // System operation: triggered by a (possibly anonymous) public submission, so
  // it must use the service-role client. The RLS SELECT policy on form_webhooks
  // is owner-scoped (auth.uid()), which would return zero rows for an anonymous
  // submitter and silently skip firing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any

  const { data: webhooks } = await sb
    .from("form_webhooks")
    .select("*")
    .eq("form_id", formId)
    .eq("is_active", true)

  if (!webhooks || webhooks.length === 0) return

  const fullPayload = { event, form_id: formId, timestamp: new Date().toISOString(), data: payload }

  for (const webhook of webhooks as FormWebhook[]) {
    if (!webhook.events.includes(event)) continue

    const body = JSON.stringify(fullPayload)
    const headers: Record<string, string> = { "Content-Type": "application/json" }

    if (webhook.secret) {
      headers["X-Webhook-Signature"] = signPayload(body, webhook.secret)
    }

    let statusCode: number | null = null
    let responseBody: string | null = null
    let errorMsg: string | null = null

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      })
      statusCode = res.status
      const text = await res.text()
      responseBody = text.slice(0, 1000)
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : "Unknown error"
    }

    try {
      await sb.from("webhook_logs").insert({
        webhook_id: webhook.id,
        form_id: formId,
        event,
        payload: fullPayload,
        status_code: statusCode,
        response_body: responseBody,
        error: errorMsg,
      })
    } catch {
      // log insertion failed — non-blocking
    }
  }
}

export async function testWebhook(webhookId: string): Promise<{
  success: boolean
  statusCode?: number
  error?: string
}> {
  const { user, db: sb } = await getAuthContext()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: webhook, error } = await sb
    .from("form_webhooks")
    .select("*")
    .eq("id", webhookId)
    .single()

  if (error || !webhook) return { success: false, error: "Webhook not found" }

  const wh = webhook as FormWebhook
  const testPayload = {
    event: "test",
    form_id: wh.form_id,
    timestamp: new Date().toISOString(),
    data: { message: "This is a test webhook from Amarel Forms" },
  }

  const body = JSON.stringify(testPayload)
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (wh.secret) {
    headers["X-Webhook-Signature"] = signPayload(body, wh.secret)
  }

  let statusCode: number | null = null
  let responseBody: string | null = null
  let errorMsg: string | null = null

  try {
    const res = await fetch(wh.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    })
    statusCode = res.status
    const text = await res.text()
    responseBody = text.slice(0, 1000)
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Unknown error"
  }

  try {
    await sb.from("webhook_logs").insert({
      webhook_id: wh.id,
      form_id: wh.form_id,
      event: "test",
      payload: testPayload,
      status_code: statusCode,
      response_body: responseBody,
      error: errorMsg,
    })
  } catch {
    // non-blocking
  }

  if (errorMsg) return { success: false, error: errorMsg }
  return { success: statusCode !== null && statusCode >= 200 && statusCode < 300, statusCode: statusCode ?? undefined }
}

// ─── Superadmin: replay existing responses to a form's webhooks ───────────────
// Lets a superadmin re-send past submissions to the active webhooks of ANY form
// (e.g. after a webhook was recreated). Uses the admin client throughout so it
// works regardless of form ownership / RLS.

export interface ResendFormOption {
  id: string
  name: string
  owner_email: string | null
  response_count: number
  webhook_count: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function listFormsForWebhookResend(): Promise<{
  forms: ResendFormOption[]
  error?: string
}> {
  const { user, isSuperadmin, db } = await getAuthContext()
  if (!user) return { forms: [], error: "Unauthorized" }
  if (!isSuperadmin) return { forms: [], error: "פעולה זו זמינה לסופר אדמין בלבד." }

  // Only forms that have at least one active webhook are relevant for resend.
  const { data: hooks, error: hooksErr } = await db
    .from("form_webhooks")
    .select("form_id, is_active")
    .eq("is_active", true)
  if (hooksErr) return { forms: [], error: hooksErr.message }

  const counts = new Map<string, number>()
  for (const h of (hooks ?? []) as { form_id: string }[]) {
    counts.set(h.form_id, (counts.get(h.form_id) ?? 0) + 1)
  }
  const formIds = [...counts.keys()]
  if (formIds.length === 0) return { forms: [] }

  const { data: forms, error: formsErr } = await db
    .from("forms")
    .select("id, name, user_id")
    .in("id", formIds)
  if (formsErr) return { forms: [], error: formsErr.message }

  const out: ResendFormOption[] = []
  for (const f of (forms ?? []) as { id: string; name: string; user_id: string }[]) {
    const { count } = await db
      .from("responses")
      .select("*", { count: "exact", head: true })
      .eq("form_id", f.id)
    let owner_email: string | null = null
    try {
      const { data: u } = await db.auth.admin.getUserById(f.user_id)
      owner_email = u?.user?.email ?? null
    } catch {
      // ignore — email is informational only
    }
    out.push({
      id: f.id,
      name: f.name,
      owner_email,
      response_count: count ?? 0,
      webhook_count: counts.get(f.id) ?? 0,
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "he"))
  return { forms: out }
}

export interface ResendResponseItem {
  id: string
  label: string
  submitted_at: string
  delivered: boolean
}

// Per-response list for the cherry-pick picker (superadmin, any form).
export async function listFormResponsesForResend(formId: string): Promise<{
  responses: ResendResponseItem[]
  error?: string
}> {
  const { user, isSuperadmin, db } = await getAuthContext()
  if (!user) return { responses: [], error: "Unauthorized" }
  if (!isSuperadmin) return { responses: [], error: "פעולה זו זמינה לסופר אדמין בלבד." }

  const { data: formRow } = await db.from("forms").select("fields").eq("id", formId).single()
  const fields = ((formRow?.fields ?? []) as FieldConfig[]) || []
  // Best-effort display label: a "name" field, else the first labelled input field.
  const nameField =
    fields.find((f) => f.type === "text" && (f.label || "").includes("שם")) ??
    fields.find((f) => !isLayoutField(f.type) && !!f.label)

  const { data: rows, error } = await db
    .from("responses")
    .select("id, data, submitted_at")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })
    .limit(1000)
  if (error) return { responses: [], error: error.message }

  // Which responses already have a delivered (2xx) webhook log
  const { data: logs } = await db
    .from("webhook_logs")
    .select("payload, status_code")
    .eq("form_id", formId)
  const delivered = new Set<string>()
  for (const l of (logs ?? []) as { payload: { data?: { response_id?: string } }; status_code: number | null }[]) {
    const rid = l.payload?.data?.response_id
    if (rid && l.status_code != null && l.status_code >= 200 && l.status_code < 300) delivered.add(rid)
  }

  const responses: ResendResponseItem[] = (
    (rows ?? []) as { id: string; data: Record<string, string | string[]>; submitted_at: string }[]
  ).map((r) => {
    const raw = nameField ? (r.data ?? {})[nameField.id] : ""
    const label = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "")
    return { id: r.id, label: label.trim(), submitted_at: r.submitted_at, delivered: delivered.has(r.id) }
  })
  return { responses }
}

export async function resendFormResponsesToWebhooks(
  formId: string,
  mode: "all" | "last" | "selected",
  count = 1,
  responseIds?: string[]
): Promise<{ sent: number; failed: number; total: number; webhooks: number; error?: string }> {
  const { user, isSuperadmin, db } = await getAuthContext()
  if (!user) return { sent: 0, failed: 0, total: 0, webhooks: 0, error: "Unauthorized" }
  if (!isSuperadmin)
    return { sent: 0, failed: 0, total: 0, webhooks: 0, error: "פעולה זו זמינה לסופר אדמין בלבד." }

  // Active webhooks subscribed to response_submitted
  const { data: webhooks } = await db
    .from("form_webhooks")
    .select("*")
    .eq("form_id", formId)
    .eq("is_active", true)
  const activeHooks = ((webhooks ?? []) as FormWebhook[]).filter((w) =>
    w.events.includes("response_submitted")
  )
  if (activeHooks.length === 0)
    return { sent: 0, failed: 0, total: 0, webhooks: 0, error: "לא נמצא Webhook פעיל לטופס זה." }

  // Form (for enrichment)
  const { data: formRow } = await db
    .from("forms")
    .select("fields, settings, schema")
    .eq("id", formId)
    .single()
  if (!formRow)
    return { sent: 0, failed: 0, total: 0, webhooks: 0, error: "הטופס לא נמצא." }
  const form = rowToForm(formRow)

  // Responses (oldest→newest so replays arrive in original order)
  let query = db
    .from("responses")
    .select("id, data, submitted_at")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })
  if (mode === "selected") {
    const ids = (responseIds ?? []).slice(0, 1000)
    if (ids.length === 0)
      return { sent: 0, failed: 0, total: 0, webhooks: 0, error: "לא נבחרו תגובות." }
    query = query.in("id", ids)
  } else if (mode === "last") {
    query = query.limit(Math.max(1, Math.min(count, 1000)))
  }
  const { data: respRows, error: respErr } = await query
  if (respErr) return { sent: 0, failed: 0, total: 0, webhooks: 0, error: respErr.message }

  const responses = ((respRows ?? []) as { id: string; data: Record<string, string | string[]>; submitted_at: string }[]).reverse()

  let sent = 0
  let failed = 0
  for (const r of responses) {
    const enrichment = buildWebhookEnrichment(form, r.data ?? {})
    const fullPayload = {
      event: "response_submitted",
      form_id: formId,
      timestamp: new Date().toISOString(),
      data: {
        response_id: r.id,
        response_data: r.data ?? {},
        answers: enrichment.answers,
        resolved: enrichment.resolved,
        resent: true,
      },
    }
    const body = JSON.stringify(fullPayload)

    for (const wh of activeHooks) {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (wh.secret) headers["X-Webhook-Signature"] = signPayload(body, wh.secret)
      let statusCode: number | null = null
      let responseBody: string | null = null
      let errorMsg: string | null = null
      try {
        const res = await fetch(wh.url, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) })
        statusCode = res.status
        responseBody = (await res.text()).slice(0, 1000)
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : "Unknown error"
      }
      if (errorMsg || statusCode === null || statusCode < 200 || statusCode >= 300) failed++
      else sent++

      try {
        await db.from("webhook_logs").insert({
          webhook_id: wh.id,
          form_id: formId,
          event: "response_submitted.resent",
          payload: fullPayload,
          status_code: statusCode,
          response_body: responseBody,
          error: errorMsg,
        })
      } catch {
        // non-blocking
      }
    }
    // gentle throttle so Make doesn't rate-limit on large replays
    await sleep(120)
  }

  return { sent, failed, total: responses.length, webhooks: activeHooks.length }
}
