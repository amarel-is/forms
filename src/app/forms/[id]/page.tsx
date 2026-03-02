import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { FormBuilder } from "@/components/form-builder/form-builder"
import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !row) notFound()

  return <FormBuilder initialForm={rowToForm(row)} />
}
