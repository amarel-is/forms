import { Metadata } from "next"
import { redirect } from "next/navigation"
import { FormBuilder } from "@/components/form-builder/form-builder"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "טופס חדש",
}

export default async function NewFormPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return <FormBuilder />
}
