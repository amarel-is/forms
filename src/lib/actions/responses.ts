"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/supabase/auth-context"
import { initializeApprovalForResponse } from "@/lib/actions/approvals"
import { fireWebhooks } from "@/lib/actions/webhooks"
import { buildWebhookEnrichment } from "@/lib/webhook-enrich"
import { rowToForm, rowToResponse, type FormResponse, type AnswerData } from "@/lib/types"

export async function submitResponse(
  formId: string,
  data: AnswerData,
  deviceId?: string
): Promise<{ success?: boolean; error?: string; warning?: string; response_id?: string }> {
  const supabase = await createClient()
  let responseId: string | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcResponseId, error: rpcError } = await (supabase as any).rpc(
    "submit_response_public",
    {
      p_form_id: formId,
      p_data: data,
      p_device_id: deviceId ?? null,
    }
  )

  // Backward-compatible fallback for environments where the RPC is not deployed yet.
  if (rpcError) {
    // Known domain errors — return user-friendly messages, do not fall through to direct insert.
    if (rpcError.message === "submission_limit_exceeded") {
      // deviceId is only sent in per-device mode → message it accordingly.
      return { error: deviceId ? "כבר הצבעת מהמכשיר הזה." : "הגשת כבר את הטופס עם מזהה זה." }
    }
    if (rpcError.message === "submission_not_yet_open") {
      return { error: "הטופס טרם נפתח להגשה." }
    }
    if (rpcError.message === "submission_deadline_passed") {
      return { error: "המועד האחרון להגשת הטופס עבר." }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("responses")
      .insert({ form_id: formId, data })
    if (insertError) return { error: insertError.message }
  } else {
    responseId = (rpcResponseId as string | null) ?? null
    if (!responseId) {
      return { error: "הטופס אינו זמין כרגע לקבלת תגובות." }
    }
  }

  if (responseId) {
    // Resolve human-readable answers + dataset-backed values (e.g. WhatsApp
    // links) so external consumers get everything without their own lookups.
    let enrichment: ReturnType<typeof buildWebhookEnrichment> = { answers: {}, items: {}, resolved: {} }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: formRow } = await (supabase as any)
        .from("forms")
        .select("fields, settings, schema")
        .eq("id", formId)
        .single()
      if (formRow) enrichment = buildWebhookEnrichment(rowToForm(formRow), data)
    } catch {
      // enrichment is best-effort — never block the submission
    }

    // Fire response_submitted webhooks (non-blocking)
    fireWebhooks(formId, "response_submitted", {
      response_id: responseId,
      response_data: data,
      answers: enrichment.answers,
      items: enrichment.items,
      resolved: enrichment.resolved,
    }).catch(() => {})

    const result = await initializeApprovalForResponse(responseId)
    if (!result.created && result.reason && result.reason !== "workflow_disabled" && result.reason !== "not_approval_form") {
      return { success: true, warning: "התגובה נשמרה אך יצירת סבב האישור נכשלה." }
    }
  }

  return { success: true, ...(responseId ? { response_id: responseId } : {}) }
}

export async function deleteResponse(
  responseId: string,
  formId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Unauthorized" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("responses")
    .delete()
    .eq("id", responseId)
    .eq("form_id", formId)

  if (error) return { error: error.message }

  return { success: true }
}

export async function deleteAllResponses(
  formId: string
): Promise<{ success?: boolean; error?: string }> {
  const { user, isSuperadmin, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }

  // Verify form exists and (unless superadmin) is owned by the user
  let formQuery = db.from("forms").select("id").eq("id", formId)
  if (!isSuperadmin) formQuery = formQuery.eq("user_id", user.id)
  const { data: formRow } = await formQuery.single()

  if (!formRow) return { error: "הטופס לא נמצא" }

  const { error } = await db.from("responses").delete().eq("form_id", formId)
  if (error) return { error: error.message }

  return { success: true }
}

// ─── Editing + audit log ──────────────────────────────────────────────────────

export interface ResponseEdit {
  id: string
  action: "update" | "delete"
  source: "dashboard" | "restore" | "api"
  old_data: AnswerData | null
  new_data: AnswerData | null
  changed_keys: string[]
  edited_by_email: string | null
  created_at: string
}

const EDIT_ERRORS: Record<string, string> = {
  forbidden: "אין לך הרשאה לערוך תגובה זו",
  not_found: "התגובה לא נמצאה",
  invalid_patch: "נתונים לא תקינים",
}

/**
 * Edit a submission. Goes through the `update_response_data` RPC, which
 * checks ownership and lets the DB trigger snapshot the previous answers into
 * `response_edits` — so an edit can always be traced and undone.
 */
export async function updateResponse(
  responseId: string,
  formId: string,
  patch: AnswerData,
  source: "dashboard" | "restore" = "dashboard"
): Promise<{ success?: boolean; error?: string; data?: AnswerData }> {
  const { user, isSuperadmin, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }
  if (Object.keys(patch).length === 0 && source === "dashboard") return { success: true }

  const { data, error } = await db.rpc("update_response_data", {
    p_response_id: responseId,
    p_form_id: formId,
    p_patch: patch,
    p_source: source,
    p_editor_id: isSuperadmin ? user.id : null,
    p_editor_email: isSuperadmin ? (user.email ?? null) : null,
  })

  if (error) return { error: EDIT_ERRORS[error.message] ?? error.message }
  return { success: true, data: (data ?? {}) as AnswerData }
}

export async function getResponseHistory(
  responseId: string,
  formId: string
): Promise<{ edits: ResponseEdit[]; error?: string }> {
  const { user, isSuperadmin, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized", edits: [] }

  if (isSuperadmin === false) {
    const { data: formRow } = await db.from("forms").select("id").eq("id", formId).eq("user_id", user.id).maybeSingle()
    if (!formRow) return { error: "הטופס לא נמצא", edits: [] }
  }

  const { data, error } = await db
    .from("response_edits")
    .select("id, action, source, old_data, new_data, changed_keys, edited_by_email, created_at")
    .eq("response_id", responseId)
    .eq("form_id", formId)
    .order("created_at", { ascending: false })

  if (error) return { error: error.message, edits: [] }
  return { edits: (data ?? []) as ResponseEdit[] }
}

/** Put a submission back to how it was before a given edit. Logged as a new edit. */
export async function restoreResponseVersion(
  editId: string,
  formId: string
): Promise<{ success?: boolean; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }

  const { data: edit, error } = await db
    .from("response_edits")
    .select("response_id, old_data, action")
    .eq("id", editId)
    .eq("form_id", formId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!edit || edit.action !== "update" || !edit.old_data) return { error: "הגרסה לא נמצאה" }

  const res = await updateResponse(edit.response_id as string, formId, edit.old_data as AnswerData, "restore")
  return res.error ? { error: res.error } : { success: true }
}

export async function getResponses(
  formId: string
): Promise<{ responses: FormResponse[]; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized", responses: [] }

  const { data: rows, error } = await db
    .from("responses")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })

  if (error) return { error: error.message, responses: [] }

  return { responses: (rows ?? []).map(rowToResponse) }
}
