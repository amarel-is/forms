import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { listPendingUsers } from "@/lib/actions/auth"
import { listFormsForWebhookResend } from "@/lib/actions/webhooks"
import { PendingUsersList } from "./pending-users-list"
import { WebhookResendPanel } from "./webhook-resend-panel"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "ניהול משתמשים",
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (user.user_metadata?.superadmin !== true) redirect("/dashboard")

  const { users } = await listPendingUsers()
  const { forms: resendForms } = await listFormsForWebhookResend()

  return (
    <div className="min-h-screen bg-neutral-50" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        <section>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">ניהול משתמשים</h1>
            <p className="text-sm text-neutral-500 mt-1">
              בקשות הרשמה הממתינות לאישור. אישור מאפשר למשתמש להיכנס למערכת; דחייה מוחקת את הבקשה.
            </p>
          </div>

          <PendingUsersList initialUsers={users ?? []} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-neutral-900">שליחה חוזרת ל-Webhook</h2>
            <p className="text-sm text-neutral-500 mt-1">
              שליחה מחדש של תגובות קיימות ל-Webhook הפעיל של טופס — שימושי אם ה-Webhook נמחק/הוחלף
              וצריך לסנכרן תגובות שכבר נקלטו.
            </p>
          </div>

          <WebhookResendPanel forms={resendForms ?? []} />
        </section>
      </div>
    </div>
  )
}
