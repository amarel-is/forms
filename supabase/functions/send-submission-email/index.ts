// Called by the `on_new_response_email_alert` Postgres trigger (via pg_net) whenever a
// response is inserted into a form with settings.email_alert_enabled = true.
// Auth: not a public endpoint — verify_jwt is off and the trigger instead sends a shared
// secret (X-Internal-Secret) stored in Supabase Vault, checked below.
import { createClient } from "jsr:@supabase/supabase-js@2"

const SITE_URL = "https://forms.amarel.net"
const RESEND_FROM = "Amarel Forms <onboarding@resend.dev>"

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

function formatAnswer(raw: unknown): string {
  if (raw == null || raw === "") return "—"
  if (Array.isArray(raw)) return escapeHtml(raw.join(", "))
  return escapeHtml(String(raw))
}

function buildEmailHtml(formName: string, formId: string, fields: FieldConfig[], data: Record<string, unknown>): string {
  const rows = fields
    .filter((f) => f.id in data)
    .map(
      (f) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;white-space:nowrap;">${escapeHtml(f.label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111;">${formatAnswer(data[f.id])}</td>
        </tr>`
    )
    .join("")

  return `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#ea580c;">התקבלה הגשה חדשה</h2>
      <p style="color:#333;">התקבלה הגשה חדשה בטופס <strong>${escapeHtml(formName)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
      <p>
        <a href="${SITE_URL}/forms/${formId}/responses" style="display:inline-block;background:#ea580c;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;">
          צפייה בכל התגובות
        </a>
      </p>
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

    const [{ data: form }, { data: response }] = await Promise.all([
      supabase.from("forms").select("name, user_id, fields, settings").eq("id", form_id).single(),
      supabase.from("responses").select("data").eq("id", response_id).single(),
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
      (response.data ?? {}) as Record<string, unknown>
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
