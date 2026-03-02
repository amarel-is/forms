import { Metadata } from "next"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/layout/amarel-nav"
import { createClient } from "@/lib/supabase/server"
import { ChangePasswordForm } from "./change-password-form"

export const metadata: Metadata = { title: "הפרופיל שלי" }

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader userId={user.id} userEmail={user.email ?? undefined} activePath="profile" />

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-neutral-900">הפרופיל שלי</h1>
          <p className="text-sm text-neutral-500 mt-0.5">ניהול פרטי חשבון</p>
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">
            פרטי חשבון
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">כתובת אימייל</span>
            <span className="text-sm font-medium text-neutral-900 dir-ltr" dir="ltr">
              {user.email}
            </span>
          </div>
        </div>

        {/* Change password */}
        <ChangePasswordForm />
      </main>
    </div>
  )
}
