"use server"

import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const BACKUP_COOKIE = "admin_session_backup"

export interface StartImpersonationResult {
  token_hash?: string
  email?: string
  error?: string
}

/**
 * Initiates impersonation of another user.
 * - Saves the current superadmin's session tokens to an httpOnly backup cookie
 * - Generates a magic-link token for the target user (without sending email)
 * - Returns the token_hash for the client to consume via verifyOtp
 */
export async function startImpersonation(targetUserId: string): Promise<StartImpersonationResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "לא מחובר" }
  if (user.user_metadata?.superadmin !== true) return { error: "אין הרשאה" }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: "אין session פעיל" }

  const admin = createAdminClient()
  const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(targetUserId)
  if (targetErr || !targetData?.user?.email) return { error: "המשתמש לא נמצא" }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetData.user.email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    return { error: linkErr?.message ?? "יצירת קישור נכשלה" }
  }

  const cookieStore = await cookies()
  cookieStore.set(
    BACKUP_COOKIE,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      admin_email: user.email,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    }
  )

  return {
    token_hash: linkData.properties.hashed_token,
    email: targetData.user.email,
  }
}

/**
 * Restores the superadmin's original session from the backup cookie.
 */
export async function stopImpersonation(): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies()
  const backup = cookieStore.get(BACKUP_COOKIE)
  if (!backup) return { error: "אין גיבוי זמין" }

  let parsed: { access_token: string; refresh_token: string }
  try {
    parsed = JSON.parse(backup.value)
  } catch {
    cookieStore.delete(BACKUP_COOKIE)
    return { error: "גיבוי פגום" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.setSession({
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
  })

  if (error) return { error: error.message }

  cookieStore.delete(BACKUP_COOKIE)
  return { success: true }
}

export interface ImpersonationInfo {
  isImpersonating: boolean
  adminEmail?: string
  currentEmail?: string
}

export async function getImpersonationInfo(): Promise<ImpersonationInfo> {
  const cookieStore = await cookies()
  const backup = cookieStore.get(BACKUP_COOKIE)
  if (!backup) return { isImpersonating: false }

  try {
    const parsed = JSON.parse(backup.value) as { admin_email?: string }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return {
      isImpersonating: true,
      adminEmail: parsed.admin_email,
      currentEmail: user?.email,
    }
  } catch {
    return { isImpersonating: false }
  }
}
