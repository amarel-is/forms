import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function authenticateApiKey(
  request: NextRequest,
  formId: string
): Promise<{ error?: NextResponse }> {
  const apiKey = request.headers.get("x-api-key")
  if (!apiKey) {
    return { error: NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: form } = await supabase
    .from("forms")
    .select("id, api_key")
    .eq("id", formId)
    .single()

  if (!form || form.api_key !== apiKey) {
    return { error: NextResponse.json({ error: "Invalid API key" }, { status: 403 }) }
  }

  return {}
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; id: string }> }
) {
  const { formId, id } = await params
  const auth = await authenticateApiKey(request, formId)
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("responses")
    .select("id, form_id, data, submitted_at")
    .eq("id", id)
    .eq("form_id", formId)
    .single()

  if (error) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 })
  }

  return NextResponse.json({ submission: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; id: string }> }
) {
  const { formId, id } = await params
  const auth = await authenticateApiKey(request, formId)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing, error: fetchError } = await supabase
    .from("responses")
    .select("id, data")
    .eq("id", id)
    .eq("form_id", formId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 })
  }

  const currentData = (existing.data ?? {}) as Record<string, unknown>
  const mergedData = { ...currentData, ...body.data }

  const { data, error } = await supabase
    .from("responses")
    .update({ data: mergedData })
    .eq("id", id)
    .eq("form_id", formId)
    .select("id, form_id, data, submitted_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ submission: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; id: string }> }
) {
  const { formId, id } = await params
  const auth = await authenticateApiKey(request, formId)
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("responses")
    .delete()
    .eq("id", id)
    .eq("form_id", formId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
