"use server"

import crypto from "crypto"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getAuthContext } from "@/lib/supabase/auth-context"
import { createAdminClient } from "@/lib/supabase/admin"
import { rowToForm, rowToShareLink, SUBMITTED_AT_COLUMN, type ResultShareLink } from "@/lib/types"
import {
  hashSharePassword,
  verifySharePassword,
  shareUnlockCookieName,
  shareUnlockCookieValue,
  isShareFilterField,
  isShareableColumn,
} from "@/lib/share-links"

// password_hash is never selected back to the client.
const LINK_COLUMNS =
  "id, form_id, token, name, filter_field_id, filter_values, column_ids, allow_download, is_active, expires_at, password_hash, view_count, created_at"

export async function getShareLinks(formId: string): Promise<{ links: ResultShareLink[]; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { links: [], error: "Unauthorized" }
  const { data, error } = await db
    .from("result_share_links")
    .select(LINK_COLUMNS)
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
  if (error) return { links: [], error: error.message }
  return { links: (data ?? []).map(rowToShareLink) }
}

export async function createShareLink(input: {
  formId: string
  name: string
  filterFieldId: string
  filterValues: string[]
  columnIds: string[]
  allowDownload: boolean
  expiresAt: string | null
  password: string | null
}): Promise<{ link?: ResultShareLink; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }

  const name = input.name.trim()
  if (!name) return { error: "תן לקישור שם" }
  if (input.filterValues.length === 0) return { error: "בחר לפחות ערך אחד לסינון" }
  if (input.columnIds.length === 0) return { error: "בחר לפחות עמודה אחת להצגה" }
  if (input.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)) return { error: "תאריך תפוגה לא תקין" }
  const password = input.password?.trim() || null
  if (password && password.length < 4) return { error: "הסיסמה צריכה לכלול לפחות 4 תווים" }

  // Read through the caller's client so RLS confirms ownership.
  const { data: formRow } = await db.from("forms").select("*").eq("id", input.formId).maybeSingle()
  if (!formRow) return { error: "הטופס לא נמצא" }
  const form = rowToForm(formRow)

  const filterField = form.fields.find((f) => f.id === input.filterFieldId)
  if (!filterField || !isShareFilterField(filterField)) return { error: "שדה הסינון חייב להיות שדה בחירה" }

  const validColumns = new Set([SUBMITTED_AT_COLUMN, ...form.fields.filter(isShareableColumn).map((f) => f.id)])
  const columnIds = input.columnIds.filter((id) => validColumns.has(id))
  if (columnIds.length === 0) return { error: "בחר לפחות עמודה אחת להצגה" }

  const { data, error } = await db
    .from("result_share_links")
    .insert({
      form_id: input.formId,
      token: crypto.randomBytes(16).toString("base64url"),
      name,
      filter_field_id: filterField.id,
      filter_values: Array.from(new Set(input.filterValues)),
      column_ids: columnIds,
      allow_download: input.allowDownload,
      expires_at: input.expiresAt || null,
      password_hash: password ? hashSharePassword(password) : null,
    })
    .select(LINK_COLUMNS)
    .single()
  if (error) return { error: error.message }

  revalidatePath(`/forms/${input.formId}/results`)
  return { link: rowToShareLink(data) }
}

export async function setShareLinkActive(
  id: string,
  isActive: boolean
): Promise<{ link?: ResultShareLink; error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }
  const { data, error } = await db
    .from("result_share_links")
    .update({ is_active: isActive })
    .eq("id", id)
    .select(LINK_COLUMNS)
    .single()
  if (error) return { error: error.message }
  return { link: rowToShareLink(data) }
}

export async function deleteShareLink(id: string): Promise<{ error?: string }> {
  const { user, db } = await getAuthContext()
  if (!user) return { error: "Unauthorized" }
  const { error } = await db.from("result_share_links").delete().eq("id", id)
  if (error) return { error: error.message }
  return {}
}

/** Public: checks a share link's password and sets the unlock cookie. */
export async function unlockShareLink(token: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { ok: false, error: "הקישור לא נמצא" }
  const admin = createAdminClient()
  const { data } = await admin
    .from("result_share_links")
    .select("password_hash, is_active")
    .eq("token", token)
    .maybeSingle()
  if (!data || !data.is_active) return { ok: false, error: "הקישור אינו פעיל" }
  if (!data.password_hash) return { ok: true }
  if (!verifySharePassword(password, data.password_hash)) return { ok: false, error: "הסיסמה שגויה. נסו שוב." }

  const store = await cookies()
  store.set(shareUnlockCookieName(token), shareUnlockCookieValue(token, data.password_hash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/r/${token}`,
    maxAge: 60 * 60 * 24 * 30,
  })
  return { ok: true }
}
