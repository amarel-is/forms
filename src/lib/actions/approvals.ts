"use server"

import { createClient } from "@/lib/supabase/server"
import type { FieldConfig, FormSettings, ResponseApproval } from "@/lib/types"

const APPROVAL_WEBHOOK_URL = "https://hook.eu1.make.com/3dc68drtg0nttai6qlggl6agt8bm8fqe"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://forms-cyan-theta.vercel.app/"

async function notifyApproverViaWebhook(payload: {
  event: "approval_requested" | "next_step_requested" | "approval_completed"
  approve_url?: string
  token?: string
  form_name: string
  form_id: string
  response_id: string
  approval_id: string
  step_index: number
  total_steps: number
  approver_name: string
  approver_channel: "email" | "whatsapp"
  approver_target: string
  response_data?: Record<string, string | string[]>
  final_status?: string
}): Promise<void> {
  try {
    await fetch(APPROVAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // fire-and-forget — webhook failure should not block the approval flow
  }
}

export type ApprovalTokenView = {
  response_approval_id: string
  response_approval_step_id: string
  form_id: string
  form_name: string
  form_fields: FieldConfig[]
  form_settings: FormSettings
  response_id: string
  response_data: Record<string, string | string[]>
  step_index: number
  total_steps: number
  approver_name: string
  approver_channel: "email" | "whatsapp"
  approver_target: string
  expires_at: string
}

export async function initializeApprovalForResponse(responseId: string): Promise<{
  created: boolean
  approvalId?: string
  firstToken?: string
  reason?: string
}> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("initialize_approval_for_response", {
    p_response_id: responseId,
  })

  if (error) return { created: false, reason: error.message }
  if (!data || typeof data !== "object") return { created: false, reason: "unexpected_result" }
  if (!data.created) return { created: false, reason: data.reason ?? "not_created" }

  const approvalId = data.approval_id as string
  const firstToken = data.first_token as string

  if (firstToken && approvalId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: respRow } = await sb
      .from("responses")
      .select("form_id, data")
      .eq("id", responseId)
      .single()

    const { data: formRow } = await sb
      .from("forms")
      .select("name, settings")
      .eq("id", respRow?.form_id)
      .single()

    const { data: stepRow } = await sb
      .from("response_approval_steps")
      .select("approver_name, approver_channel, approver_target")
      .eq("response_approval_id", approvalId)
      .eq("step_index", 0)
      .single()

    const wfSteps = ((formRow?.settings as Record<string, unknown>)?.approval_workflow as Record<string, unknown>)?.steps
    const totalSteps = Array.isArray(wfSteps) ? wfSteps.length : 1

    if (stepRow) {
      await notifyApproverViaWebhook({
        event: "approval_requested",
        approve_url: `${SITE_URL}/approve/${firstToken}`,
        token: firstToken,
        form_name: formRow?.name ?? "",
        form_id: respRow?.form_id ?? "",
        response_id: responseId,
        approval_id: approvalId,
        step_index: 0,
        total_steps: totalSteps,
        approver_name: stepRow.approver_name,
        approver_channel: stepRow.approver_channel,
        approver_target: stepRow.approver_target,
        response_data: (respRow?.data ?? {}) as Record<string, string | string[]>,
      })
    }
  }

  return {
    created: true,
    approvalId,
    firstToken,
  }
}

export async function getApprovalByToken(token: string): Promise<{
  approval?: ApprovalTokenView
  error?: string
}> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_approval_by_token", {
    p_token: token,
  })

  if (error) return { error: error.message }
  if (!Array.isArray(data) || data.length === 0) return { error: "invalid_or_expired_token" }

  const raw = data[0]
  return {
    approval: {
      ...raw,
      form_fields: (raw.form_fields ?? []) as FieldConfig[],
      form_settings: (raw.form_settings ?? {}) as FormSettings,
      response_data: (raw.response_data ?? {}) as Record<string, string | string[]>,
    } as ApprovalTokenView,
  }
}

export async function decideApprovalByToken(params: {
  token: string
  decision: "approved" | "rejected"
  note?: string
  signature?: string
}): Promise<{ success?: boolean; status?: string; error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("decide_approval_by_token", {
    p_token: params.token,
    p_decision: params.decision,
    p_note: params.note ?? null,
    p_signature: params.signature ?? null,
  })

  if (error) return { error: error.message }
  if (!data || typeof data !== "object") return { error: "unexpected_result" }
  if (!data.ok) return { error: data.error ?? "failed" }

  const resultStatus = data.status as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Look up context once using the original token (now marked used, but step still findable)
  const tokenHash = await sb.rpc("encode_sha256", { input: params.token }).catch(() => null)
  void tokenHash

  // Fetch the step that was just decided (most recently acted on)
  const { data: decidedStep } = await sb
    .from("response_approval_steps")
    .select("response_approval_id, step_index, approver_name")
    .eq("status", params.decision)
    .order("acted_at", { ascending: false })
    .limit(1)
    .single()

  const approvalId = decidedStep?.response_approval_id as string | undefined

  if (approvalId) {
    const { data: approvalRow } = await sb
      .from("response_approvals")
      .select("form_id, response_id, current_step_index")
      .eq("id", approvalId)
      .single()

    const { data: formRow } = await sb
      .from("forms")
      .select("name, settings")
      .eq("id", approvalRow?.form_id)
      .single()

    const { data: respRow } = await sb
      .from("responses")
      .select("data")
      .eq("id", approvalRow?.response_id)
      .single()

    const wfSteps = ((formRow?.settings as Record<string, unknown>)?.approval_workflow as Record<string, unknown>)?.steps
    const totalSteps = Array.isArray(wfSteps) ? wfSteps.length : 1

    if (resultStatus === "in_progress" && data.next_token) {
      const nextToken = data.next_token as string
      const nextIdx = data.next_step_index as number

      const { data: nextStep } = await sb
        .from("response_approval_steps")
        .select("approver_name, approver_channel, approver_target")
        .eq("response_approval_id", approvalId)
        .eq("step_index", nextIdx)
        .single()

      if (nextStep) {
        await notifyApproverViaWebhook({
          event: "next_step_requested",
          approve_url: `${SITE_URL}/approve/${nextToken}`,
          token: nextToken,
          form_name: formRow?.name ?? "",
          form_id: approvalRow?.form_id ?? "",
          response_id: approvalRow?.response_id ?? "",
          approval_id: approvalId,
          step_index: nextIdx,
          total_steps: totalSteps,
          approver_name: nextStep.approver_name,
          approver_channel: nextStep.approver_channel,
          approver_target: nextStep.approver_target,
          response_data: (respRow?.data ?? {}) as Record<string, string | string[]>,
        })
      }
    }

    if (resultStatus === "approved" || resultStatus === "rejected") {
      await notifyApproverViaWebhook({
        event: "approval_completed",
        form_name: formRow?.name ?? "",
        form_id: approvalRow?.form_id ?? "",
        response_id: approvalRow?.response_id ?? "",
        approval_id: approvalId,
        step_index: decidedStep?.step_index ?? 0,
        total_steps: totalSteps,
        approver_name: decidedStep?.approver_name ?? "",
        approver_channel: "email",
        approver_target: "",
        final_status: resultStatus,
      })
    }
  }

  return { success: true, status: resultStatus }
}

export async function getResponseApprovalsByForm(formId: string): Promise<{
  byResponseId: Record<string, ResponseApproval>
  error?: string
}> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("response_approvals")
    .select("*, response_approval_steps(*)")
    .eq("form_id", formId)

  if (error) return { byResponseId: {}, error: error.message }

  const byResponseId: Record<string, ResponseApproval> = {}
  for (const row of data ?? []) {
    if (!row?.response_id) continue
    byResponseId[row.response_id] = {
      id: row.id,
      response_id: row.response_id,
      form_id: row.form_id,
      status: row.status,
      current_step_index: row.current_step_index ?? 0,
      started_at: row.started_at,
      finished_at: row.finished_at ?? null,
      steps: ((row.response_approval_steps ?? []) as Array<Record<string, unknown>>)
        .sort((a, b) => Number(a.step_index ?? 0) - Number(b.step_index ?? 0))
        .map((step) => ({
          id: String(step.id),
          response_approval_id: String(step.response_approval_id),
          step_index: Number(step.step_index ?? 0),
          approver_name: String(step.approver_name ?? ""),
          approver_channel: (step.approver_channel === "whatsapp" ? "whatsapp" : "email") as "email" | "whatsapp",
          approver_target: String(step.approver_target ?? ""),
          status: String(step.status ?? "waiting") as "waiting" | "pending" | "approved" | "rejected" | "expired",
          acted_at: step.acted_at ? String(step.acted_at) : null,
          decision_note: step.decision_note ? String(step.decision_note) : null,
        })),
    }
  }

  return { byResponseId }
}
