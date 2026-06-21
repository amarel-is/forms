import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SignupForm from "./signup-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "הרשמה",
}

export default async function SignupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logos/amarel.png"
            alt="Amarel"
            width={180}
            height={60}
            priority
            className="mb-2"
          />
          <p className="text-sm text-neutral-400">הרשמה למערכת הטפסים</p>
        </div>

        <SignupForm />
      </div>
    </div>
  )
}
