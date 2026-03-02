"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  rowToForm,
  type FieldConfig,
  type FormSettings,
  type FormSchema,
  type FormType,
  type Form,
} from "@/lib/types"

export async function createForm(data: {
  name: string
  description?: string
  fields: FieldConfig[]
  settings: FormSettings
  schema?: FormSchema
  form_type?: FormType
  is_published?: boolean
}): Promise<{ form?: Form; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("forms")
    .insert({
      user_id: user.id,
      name: data.name,
      description: data.description ?? null,
      fields: data.fields,
      settings: data.settings,
      schema: data.schema ?? {},
      form_type: data.form_type ?? "general",
      is_published: data.is_published ?? false,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  return { form: rowToForm(row) }
}

export async function updateForm(
  id: string,
  data: {
    name?: string
    description?: string
    fields?: FieldConfig[]
    settings?: FormSettings
    schema?: FormSchema
    form_type?: FormType
    is_published?: boolean
  }
): Promise<{ form?: Form; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("forms")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath(`/forms/${id}`)
  return { form: rowToForm(row) }
}

export async function deleteForm(id: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("forms")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  return { success: true }
}
