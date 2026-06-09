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
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params
  const auth = await authenticateApiKey(request, formId)
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("responses")
    .select("id, form_id, data, submitted_at")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ submissions: data })
}
