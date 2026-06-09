"use server"

import { randomBytes } from "crypto"
import { getAuthContext } from "@/lib/supabase/auth-context"

export async function generateApiKey(
  formId: string
): Promise<{ api_key?: string; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }

  const { data: form } = await db
    .from("forms")
    .select("id, user_id")
    .eq("id", formId)
    .single()

  if (!form || form.user_id !== user.id) return { error: "Forbidden" }

  const key = `fk_${randomBytes(24).toString("hex")}`

  const { error } = await db
    .from("forms")
    .update({ api_key: key })
    .eq("id", formId)

  if (error) return { error: error.message }
  return { api_key: key }
}

export async function getApiKey(
  formId: string
): Promise<{ api_key?: string | null; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }

  const { data: form } = await db
    .from("forms")
    .select("id, user_id, api_key")
    .eq("id", formId)
    .single()

  if (!form || form.user_id !== user.id) return { error: "Forbidden" }

  return { api_key: form.api_key ?? null }
}

export async function revokeApiKey(
  formId: string
): Promise<{ success?: boolean; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }

  const { data: form } = await db
    .from("forms")
    .select("id, user_id")
    .eq("id", formId)
    .single()

  if (!form || form.user_id !== user.id) return { error: "Forbidden" }

  const { error } = await db
    .from("forms")
    .update({ api_key: null })
    .eq("id", formId)

  if (error) return { error: error.message }
  return { success: true }
}
