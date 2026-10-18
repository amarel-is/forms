import type { AnswerValue, FieldConfig, RepeaterItem } from "./types"
import { isRepeaterValue } from "./types"

// Shared helpers for turning stored answers into display text. Every view that
// prints an answer (table, CSV, email, webhook, approval, thank-you) should go
// through here so repeater items never surface as "[object Object]".

/** Plain text for a scalar or multi-choice value */
export function scalarText(v: string | string[] | undefined): string {
  if (v === undefined || v === null) return ""
  return Array.isArray(v) ? v.join(", ") : String(v)
}

/** Repeater items, normalized (drops anything that isn't an item object) */
export function repeaterItems(v: AnswerValue | undefined): RepeaterItem[] {
  if (!isRepeaterValue(v)) return []
  return v.filter((x): x is RepeaterItem => typeof x === "object" && x !== null && !Array.isArray(x))
}

/** The noun for one item, e.g. "עובד" */
export function repeaterItemNoun(field: FieldConfig): string {
  return field.item_label?.trim() || "פריט"
}

/** Title for one item card / line, e.g. "עובד 2 · דני כהן" */
export function repeaterItemTitle(field: FieldConfig, item: RepeaterItem, index: number): string {
  const base = `${repeaterItemNoun(field)} ${index + 1}`
  const titleId = field.item_title_field_id
  const titleVal = titleId ? scalarText(item[titleId]).trim() : ""
  return titleVal ? `${base} · ${titleVal}` : base
}

/** "sub label: value" pairs for one item, skipping empty answers */
export function repeaterItemPairs(
  field: FieldConfig,
  item: RepeaterItem,
  excludeId?: string
): Array<{ label: string; value: string }> {
  return (field.sub_fields ?? [])
    .filter((sf) => sf.id !== excludeId)
    .map((sf) => ({ label: sf.label || "שדה", value: scalarText(item[sf.id]) }))
    .filter((p) => p.value.trim() !== "")
}

/** Count label, e.g. "3 פריטים" */
export function repeaterCountText(count: number): string {
  return count === 1 ? "פריט אחד" : `${count} פריטים`
}

/** One line per item: "עובד 1 · דני — ציוד: מחשב; כמות: 2" */
export function repeaterLines(field: FieldConfig, value: AnswerValue | undefined): string[] {
  return repeaterItems(value).map((item, i) => {
    const pairs = repeaterItemPairs(field, item, field.item_title_field_id)
      .map((p) => `${p.label}: ${p.value}`)
      .join("; ")
    const title = repeaterItemTitle(field, item, i)
    return pairs ? `${title} — ${pairs}` : title
  })
}

/**
 * Display text for any answer. Repeater values become one line per item
 * joined by `itemSeparator` (newline by default, " | " for single-cell CSV).
 */
export function formatAnswerText(
  field: FieldConfig | undefined,
  value: AnswerValue | undefined,
  itemSeparator = "\n"
): string {
  if (value === undefined || value === null) return ""
  if (isRepeaterValue(value)) {
    if (!field) return `${value.length} פריטים`
    return repeaterLines(field, value).join(itemSeparator)
  }
  return scalarText(value as string | string[])
}

/** Repeater answer as an array of label-keyed objects (webhooks / integrations) */
export function repeaterToLabeled(field: FieldConfig, value: AnswerValue | undefined): Array<Record<string, string>> {
  return repeaterItems(value).map((item) => {
    const out: Record<string, string> = {}
    for (const sf of field.sub_fields ?? []) out[sf.label || sf.id] = scalarText(item[sf.id])
    return out
  })
}
