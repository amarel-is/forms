"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rowToForm, type Form } from "@/lib/types"

export interface TemplateListItem {
  form: Form
  creatorEmail: string
}

/** Mark a form as an org-wide template. Owner can mark their own; superadmin can mark any. */
export async function markAsTemplate(formId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  const isSuperadmin = user.user_metadata?.superadmin === true
  const client = isSuperadmin ? createAdminClient() : supabase

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any).from("forms").update({ is_template: true }).eq("id", formId)
  if (!isSuperadmin) query = query.eq("user_id", user.id)
  const { error } = await query

  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return { success: true }
}

/** Remove a form from templates. Owner can always remove their own; superadmin can remove any. */
export async function unmarkAsTemplate(formId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  const isSuperadmin = user.user_metadata?.superadmin === true
  const client = isSuperadmin ? createAdminClient() : supabase

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any).from("forms").update({ is_template: false }).eq("id", formId)
  if (!isSuperadmin) query = query.eq("user_id", user.id)
  const { error } = await query

  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return { success: true }
}

/** Delete a template entirely (superadmin only). */
export async function deleteTemplate(formId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  if (user.user_metadata?.superadmin !== true) {
    return { error: "אין הרשאה" }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("forms")
    .delete()
    .eq("id", formId)
    .eq("is_template", true)

  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return { success: true }
}

/** List all templates, enriched with creator email. Visible to any authenticated user. */
export async function getTemplates(): Promise<TemplateListItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from("forms")
    .select("*")
    .eq("is_template", true)
    .order("created_at", { ascending: false })

  if (!rows || rows.length === 0) return []

  // Fetch creator emails via admin client (service role)
  const admin = createAdminClient()
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map<string, string>()
  usersData?.users.forEach((u) => { if (u.email) emailMap.set(u.id, u.email) })

  return rows.map((row: { user_id: string } & Record<string, unknown>) => ({
    form: rowToForm(row as Parameters<typeof rowToForm>[0]),
    creatorEmail: emailMap.get(row.user_id) ?? "—",
  }))
}

/** Clone a template into the current user's own forms. Returns the new form ID. */
export async function createFormFromTemplate(templateId: string): Promise<{ formId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  // Read template (RLS permits if is_template=true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tpl, error: readErr } = await (supabase as any)
    .from("forms")
    .select("*")
    .eq("id", templateId)
    .eq("is_template", true)
    .single()

  if (readErr || !tpl) return { error: "התבנית לא נמצאה" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error: insertErr } = await (supabase as any)
    .from("forms")
    .insert({
      user_id: user.id,
      name: tpl.name,
      description: tpl.description,
      fields: tpl.fields,
      settings: tpl.settings,
      schema: tpl.schema,
      form_type: tpl.form_type,
      is_published: false,
      folder: null,
      is_template: false,
      template_category: null,
    })
    .select("id")
    .single()

  if (insertErr || !created) return { error: insertErr?.message ?? "שגיאה ביצירת הטופס" }

  revalidatePath("/dashboard")
  return { formId: created.id }
}
