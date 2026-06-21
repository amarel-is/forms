"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_DOMAIN = "amarel.net"

export interface PendingUser {
  id: string
  email: string
  full_name: string
  role: string
  division: string
  created_at: string
}

function isAllowedEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()
  return domain === ALLOWED_DOMAIN
}

// ─── Public self-registration (pending superadmin approval) ──────────────────

export async function registerUser(input: {
  email: string
  password: string
  fullName: string
  role: string
  division: string
}): Promise<{ success?: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const role = input.role.trim()
  const division = input.division.trim()

  if (!email || !isAllowedEmail(email)) {
    return { error: `ההרשמה מוגבלת לכתובות @${ALLOWED_DOMAIN} בלבד` }
  }
  if (!fullName) return { error: "נא להזין שם מלא" }
  if (!role) return { error: "נא להזין תפקיד" }
  if (!division) return { error: "נא לבחור חטיבה" }
  if (!input.password || input.password.length < 8) {
    return { error: "הסיסמה חייבת להכיל לפחות 8 תווים" }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true, // confirmed at creation; email ownership is proven by the OTP at login
    user_metadata: {
      full_name: fullName,
      role,
      division,
      approved: false, // gated until a superadmin approves in /admin
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { error: "כתובת האימייל כבר רשומה במערכת" }
    }
    if (msg.includes("amarel.net")) {
      return { error: `ההרשמה מוגבלת לכתובות @${ALLOWED_DOMAIN} בלבד` }
    }
    return { error: "ההרשמה נכשלה, נסה שוב" }
  }

  return { success: true }
}

// ─── Superadmin-only approval panel ──────────────────────────────────────────

async function getSuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.superadmin !== true) return null
  return user
}

export async function listPendingUsers(): Promise<{ users?: PendingUser[]; error?: string }> {
  if (!(await getSuperadmin())) return { error: "אין הרשאה" }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error || !data) return { error: "טעינת המשתמשים נכשלה" }

  const users = data.users
    .filter((u) => u.user_metadata?.approved === false)
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: (u.user_metadata?.full_name as string) ?? "",
      role: (u.user_metadata?.role as string) ?? "",
      division: (u.user_metadata?.division as string) ?? "",
      created_at: u.created_at,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return { users }
}

export async function approveUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await getSuperadmin())) return { error: "אין הרשאה" }

  const admin = createAdminClient()
  const { data, error: getErr } = await admin.auth.admin.getUserById(userId)
  if (getErr || !data?.user) return { error: "המשתמש לא נמצא" }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...data.user.user_metadata, approved: true },
  })
  if (error) return { error: "האישור נכשל" }

  revalidatePath("/admin")
  return { success: true }
}

export async function rejectUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await getSuperadmin())) return { error: "אין הרשאה" }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: "הדחייה נכשלה" }

  revalidatePath("/admin")
  return { success: true }
}
