// Called by the `on_new_response_email_alert` Postgres trigger (via pg_net) whenever a
// response is inserted into a form with settings.email_alert_enabled = true.
// Auth: not a public endpoint — verify_jwt is off and the trigger instead sends a shared
// secret (X-Internal-Secret) stored in Supabase Vault, checked below.
import { createClient } from "jsr:@supabase/supabase-js@2"

const SITE_URL = "https://forms.amarel.net"
const RESEND_FROM = "Amarel Forms <alerts@resend.amarel.net>"

interface FieldConfig {
  id: string
  label: string
  type: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function formatAnswer(field: FieldConfig, raw: unknown): string {
  if (raw == null || raw === "") return "—"

  if (field.type === "signature") return "✍️ נחתם"

  if (field.type === "checkbox" && typeof raw !== "object") {
    const truthy = raw === true || raw === "true" || raw === "on" || raw === "yes"
    return truthy ? "✅ כן" : "❌ לא"
  }

  if (field.type === "star_rating") {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return "⭐".repeat(Math.min(5, Math.round(n)))
  }

  if (field.type === "location" && typeof raw === "string" && /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(raw)) {
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(raw)}`
    return `<a href="${mapsUrl}" style="color:#ea580c;">${escapeHtml(raw)}</a>`
  }

  if (Array.isArray(raw)) return escapeHtml(raw.filter((v) => v !== "" && v != null).join(", ")) || "—"
  return escapeHtml(String(raw))
}

function formatSubmittedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: "Asia/Jerusalem",
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function buildEmailHtml(
  formName: string,
  formId: string,
  fields: FieldConfig[],
  data: Record<string, unknown>,
  submittedAt: string,
  responseCount: number
): string {
  const answerFields = fields.filter((f) => f.id in data)
  const rows = answerFields
    .map(
      (f, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fafafa"};">
          <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#777;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(f.label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#111;font-size:14px;">${formatAnswer(f, data[f.id])}</td>
        </tr>`
    )
    .join("")

  return `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f4;padding:24px 0;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eee;">

        <div style="background:#ea580c;padding:20px 24px;">
          <div style="color:#fff;font-size:12px;opacity:0.85;letter-spacing:0.02em;">Amarel Forms</div>
          <div style="color:#fff;font-size:20px;font-weight:bold;margin-top:4px;">הגשה חדשה התקבלה</div>
        </div>

        <div style="padding:20px 24px 4px;">
          <div style="font-size:16px;color:#111;font-weight:bold;">${escapeHtml(formName)}</div>
          <div style="font-size:13px;color:#888;margin-top:4px;">
            נשלח ב-${formatSubmittedAt(submittedAt)} · הגשה מספר ${responseCount} בטופס זה
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:16px 0 8px;">${rows}</table>

        <div style="padding:8px 24px 24px;">
          <a href="${SITE_URL}/forms/${formId}/responses" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:bold;">
            צפייה בכל התגובות ←
          </a>
        </div>
      </div>
      <div style="max-width:560px;margin:16px auto 0;text-align:center;color:#aaa;font-size:11px;">
        נשלח אוטומטית על ידי Amarel Forms · לכיבוי ההתראות היכנסו להגדרות הטופס
      </div>
    </div>`
}

Deno.serve(async (req: Request) => {
  try {
    const internalSecret = req.headers.get("X-Internal-Secret")
    if (!internalSecret) return new Response("Unauthorized", { status: 401 })

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: expectedSecret } = await supabase.rpc("get_decrypted_secret", {
      secret_name: "submission_email_internal_secret",
    })
    if (!expectedSecret || expectedSecret !== internalSecret) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { response_id, form_id } = await req.json()
    if (!response_id || !form_id) return new Response("Bad request", { status: 400 })

    const [{ data: form }, { data: response }, { count: responseCount }] = await Promise.all([
      supabase.from("forms").select("name, user_id, fields, settings").eq("id", form_id).single(),
      supabase.from("responses").select("data, submitted_at").eq("id", response_id).single(),
      supabase.from("responses").select("id", { count: "exact", head: true }).eq("form_id", form_id),
    ])
    if (!form || !response) return new Response("Not found", { status: 404 })

    const settings = (form.settings ?? {}) as { email_alert_enabled?: boolean; email_alert_recipients?: string }
    if (!settings.email_alert_enabled) return new Response("Alerts disabled", { status: 204 })

    let recipients = (settings.email_alert_recipients ?? "")
      .split(/[,\s]+/)
      .map((e) => e.trim())
      .filter((e) => /^\S+@\S+\.\S+$/.test(e))

    if (recipients.length === 0) {
      const { data: owner } = await supabase.auth.admin.getUserById(form.user_id)
      if (owner?.user?.email) recipients = [owner.user.email]
    }
    if (recipients.length === 0) return new Response("No recipients", { status: 204 })

    const { data: resendKey } = await supabase.rpc("get_decrypted_secret", {
      secret_name: "resend_api_key",
    })
    if (!resendKey) return new Response("Email not configured", { status: 500 })

    const html = buildEmailHtml(
      form.name as string,
      form_id,
      (form.fields ?? []) as FieldConfig[],
      (response.data ?? {}) as Record<string, unknown>,
      response.submitted_at as string,
      responseCount ?? 1
    )

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: recipients,
        subject: `הגשה חדשה בטופס "${form.name}"`,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("Resend send failed", res.status, errText)
      return new Response("Email send failed", { status: 502 })
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("send-submission-email error", err)
    return new Response("Internal error", { status: 500 })
  }
})
