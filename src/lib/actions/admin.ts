"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function getUsers(): Promise<{ id: string; email: string }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.superadmin !== true) return []

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error || !data) return []

  return data.users
    .map((u) => ({ id: u.id, email: u.email ?? "" }))
    .filter((u) => u.email)
    .sort((a, b) => a.email.localeCompare(b.email))
}
