import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { FormBuilder } from "@/components/form-builder/form-builder"
import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/supabase/auth-context"
import { rowToForm } from "@/lib/types"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any)
    .from("forms")
    .select("name")
    .eq("id", id)
    .single()

  return {
    title: row?.name ? `עריכה — ${row.name}` : "עריכת טופס",
  }
}

export default async function EditFormPage({ params }: Props) {
  const { id } = await params
  const { user, isSuperadmin, db } = await getAuthContext()

  if (!user) redirect("/login")

  let query = db.from("forms").select("*").eq("id", id)
  if (!isSuperadmin) query = query.eq("user_id", user.id)
  const { data: row, error } = await query.single()

  if (error || !row) notFound()

  return <FormBuilder initialForm={rowToForm(row)} />
}
