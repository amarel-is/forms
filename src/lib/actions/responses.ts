"use server"

import { createClient } from "@/lib/supabase/server"
import { initializeApprovalForResponse } from "@/lib/actions/approvals"
import { fireWebhooks } from "@/lib/actions/webhooks"
import { rowToResponse, type FormResponse } from "@/lib/types"

export async function submitResponse(
  formId: string,
  data: Record<string, string | string[]>
): Promise<{ success?: boolean; error?: string; warning?: string }> {
  const supabase = await createClient()
  let responseId: string | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcResponseId, error: rpcError } = await (supabase as any).rpc(
    "submit_response_public",
    {
      p_form_id: formId,
      p_data: data,
    }
  )

  // Backward-compatible fallback for environments where the RPC is not deployed yet.
  if (rpcError) {
    // Known domain errors — return user-friendly messages, do not fall through to direct insert.
    if (rpcError.message === "submission_limit_exceeded") {
      return { error: "הגשת כבר את הטופס עם מזהה זה." }
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
    // Fire response_submitted webhooks (non-blocking)
    fireWebhooks(formId, "response_submitted", {
      response_id: responseId,
      response_data: data,
    }).catch(() => {})

    const result = await initializeApprovalForResponse(responseId)
    if (!result.created && result.reason && result.reason !== "workflow_disabled" && result.reason !== "not_approval_form") {
      return { success: true, warning: "התגובה נשמרה אך יצירת סבב האישור נכשלה." }
    }
  }

  return { success: true }
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
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Unauthorized" }

  // Verify ownership first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: formRow } = await (supabase as any)
    .from("forms")
    .select("id")
    .eq("id", formId)
    .eq("user_id", user.id)
    .single()

  if (!formRow) return { error: "הטופס לא נמצא" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("responses")
    .delete()
    .eq("form_id", formId)

  if (error) return { error: error.message }

  return { success: true }
}

export async function getResponses(
  formId: string
): Promise<{ responses: FormResponse[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Unauthorized", responses: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("responses")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })

  if (error) return { error: error.message, responses: [] }

  return { responses: (rows ?? []).map(rowToResponse) }
}
