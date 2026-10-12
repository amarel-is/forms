// Server-only module (uses the service-role client) — never import from client components.
import crypto from "crypto"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  rowToForm,
  rowToResponse,
  rowToShareLink,
  responseMatchesShareLink,
  isLayoutField,
  SUBMITTED_AT_COLUMN,
  type FieldConfig,
} from "@/lib/types"

// Field types a share link can filter by.
export const SHARE_FILTER_TYPES = ["dropdown", "radio", "multiselect"] as const

export function isShareFilterField(f: FieldConfig): boolean {
  return (SHARE_FILTER_TYPES as readonly string[]).includes(f.type)
}

export function isShareableColumn(f: FieldConfig): boolean {
  return !isLayoutField(f.type) && !!f.label
}

// ─── Password hashing (scrypt, "salt:hash" hex) ──────────────────────────────

export function hashSharePassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 32).toString("hex")
  return `${salt}:${hash}`
}

export function verifySharePassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 32)
  const expected = Buffer.from(hash, "hex")
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)
}

// The unlock cookie is derived from the stored hash, so it can't be forged
// without DB access and stops working as soon as the password changes.
export function shareUnlockCookieName(token: string): string {
  return `rs_${token}`
}

export function shareUnlockCookieValue(token: string, passwordHash: string): string {
  return crypto.createHash("sha256").update(`${token}:${passwordHash}`).digest("hex")
}

function israelToday(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date())
}

// ─── Public view ─────────────────────────────────────────────────────────────

export interface ShareViewColumn {
  id: string
  label: string
}

export type ShareViewResult =
  | { status: "not_found" }
  | { status: "inactive" }
  | { status: "expired" }
  | { status: "locked"; name: string }
  | {
      status: "ok"
      name: string
      formName: string
      filterLabel: string
      filterValues: string[]
      allowDownload: boolean
      expiresAt: string | null
      columns: ShareViewColumn[]
      // Only the selected columns ever leave the server.
      rows: Array<Record<string, string>>
    }

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (Array.isArray(v)) return v.map(String).join(", ")
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

/**
 * Resolves a public share token to the filtered rows it may show.
 * Runs with the service-role client — every gate (active, expiry, password,
 * column whitelist) is enforced here, so callers must not bypass it.
 */
export async function getShareView(token: string, opts: { countView: boolean }): Promise<ShareViewResult> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { status: "not_found" }
  const admin = createAdminClient()

  const { data: linkRow } = await admin
    .from("result_share_links")
    .select("*")
    .eq("token", token)
    .maybeSingle()
  if (!linkRow) return { status: "not_found" }

  const link = rowToShareLink(linkRow)
  if (!link.is_active) return { status: "inactive" }
  if (link.expires_at && israelToday() > link.expires_at) return { status: "expired" }

  if (linkRow.password_hash) {
    const store = await cookies()
    const got = store.get(shareUnlockCookieName(token))?.value
    if (got !== shareUnlockCookieValue(token, linkRow.password_hash)) {
      return { status: "locked", name: link.name }
    }
  }

  const { data: formRow } = await admin.from("forms").select("*").eq("id", link.form_id).maybeSingle()
  if (!formRow) return { status: "not_found" }
  const form = rowToForm(formRow)

  const filterField = form.fields.find((f) => f.id === link.filter_field_id)
  const columns: ShareViewColumn[] = link.column_ids
    .map((id) => {
      if (id === SUBMITTED_AT_COLUMN) return { id, label: "זמן שליחה" }
      const f = form.fields.find((x) => x.id === id && isShareableColumn(x))
      return f ? { id, label: f.label } : null
    })
    .filter((c): c is ShareViewColumn => !!c)

  const { data: responseRows } = await admin
    .from("responses")
    .select("*")
    .eq("form_id", link.form_id)
    .order("submitted_at", { ascending: false })

  const rows = (responseRows ?? [])
    .map(rowToResponse)
    .filter((r) => responseMatchesShareLink(r.data, link))
    .map((r) => {
      const out: Record<string, string> = {}
      for (const c of columns) {
        out[c.id] =
          c.id === SUBMITTED_AT_COLUMN
            ? new Date(r.submitted_at).toLocaleString("he-IL", {
                timeZone: "Asia/Jerusalem",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : displayValue(r.data[c.id])
      }
      return out
    })

  if (opts.countView) {
    // Best-effort counter; a lost increment under concurrency is acceptable.
    await admin
      .from("result_share_links")
      .update({ view_count: link.view_count + 1 })
      .eq("id", link.id)
  }

  return {
    status: "ok",
    name: link.name,
    formName: form.name,
    filterLabel: filterField?.label ?? "",
    filterValues: link.filter_values,
    allowDownload: link.allow_download,
    expiresAt: link.expires_at,
    columns,
    rows,
  }
}
