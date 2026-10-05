"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const RESEND_COOLDOWN_MS = 60_000

/** Israeli local (05X...) or international digits → GREEN-API chatId, or null if invalid. */
function toChatId(raw: string): string | null {
  let digits = raw.replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = "972" + digits.slice(1)
  if (digits.length < 11 || digits.length > 15) return null
  return `${digits}@c.us`
}

/**
 * Sends the login 2FA code to a WhatsApp number typed on the login screen.
 * The caller must already have passed the password step (has a session) —
 * the code is generated for the session's own email, never a client-supplied one.
 * Generating a new code invalidates the one sent by email. The phone is not stored.
 */
export async function sendLoginCodeWhatsApp(phone: string): Promise<{ error?: string }> {
  const apiUrl = process.env.GREEN_API_URL
  const idInstance = process.env.GREEN_API_ID_INSTANCE
  const apiToken = process.env.GREEN_API_TOKEN
  if (!apiUrl || !idInstance || !apiToken) return { error: "שליחה בוואטסאפ אינה מוגדרת" }

  const chatId = toChatId(phone)
  if (!chatId) return { error: "מספר טלפון לא תקין" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: "יש להתחבר מחדש" }

  const lastSent = Number(user.app_metadata?.wa_otp_sent_at ?? 0)
  if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
    return { error: "המתן דקה לפני שליחה נוספת" }
  }

  const admin = createAdminClient()
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  })
  const code = linkData?.properties?.email_otp
  if (linkErr || !code) return { error: "יצירת קוד נכשלה, נסה שוב" }

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, wa_otp_sent_at: Date.now() },
  })

  const res = await fetch(
    `${apiUrl.replace(/\/$/, "")}/waInstance${idInstance}/sendMessage/${apiToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        message: `קוד הכניסה שלך ל-Amarel Forms: *${code}*\n\nאם לא ביקשת את הקוד — התעלם מהודעה זו.`,
      }),
    }
  )
  if (!res.ok) {
    console.error("GREEN-API send failed", res.status, await res.text())
    // The emailed code was already invalidated by generateLink — user must resend by email
    return { error: "שליחה בוואטסאפ נכשלה — לחץ ״שלח מחדש למייל״ לקבלת קוד חדש" }
  }
  return {}
}
