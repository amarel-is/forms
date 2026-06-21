import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { listPendingUsers } from "@/lib/actions/auth"
import { PendingUsersList } from "./pending-users-list"

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

  return (
    <div className="min-h-screen bg-neutral-50" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">ניהול משתמשים</h1>
          <p className="text-sm text-neutral-500 mt-1">
            בקשות הרשמה הממתינות לאישור. אישור מאפשר למשתמש להיכנס למערכת; דחייה מוחקת את הבקשה.
          </p>
        </div>

        <PendingUsersList initialUsers={users ?? []} />
      </div>
    </div>
  )
}
