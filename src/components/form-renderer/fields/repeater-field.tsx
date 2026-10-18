"use client"

import { useState, type ReactNode } from "react"
import { Copy, Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import type { FieldConfig, RepeaterItem } from "@/lib/types"
import { repeaterItemNoun, repeaterItemTitle } from "@/lib/answer-format"

// ─── Helpers (shared with the renderer's validation / submit) ─────────────────

/** A fresh item with each sub-field at its default value */
export function emptyRepeaterItem(field: FieldConfig): RepeaterItem {
  const item: RepeaterItem = {}
  for (const sf of field.sub_fields ?? []) {
    if (sf.type === "multiselect") {
      item[sf.id] = Array.isArray(sf.default_value) ? sf.default_value : []
    } else if (sf.type === "checkbox") {
      item[sf.id] = sf.default_value === true ? "true" : ""
    } else if (sf.type === "date" && sf.default_value === "__now__") {
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString()
      item[sf.id] = (sf.date_mode ?? "date") === "datetime" ? local.slice(0, 16) : local.slice(0, 10)
    } else if (sf.default_value !== undefined && typeof sf.default_value !== "boolean" && !Array.isArray(sf.default_value)) {
      item[sf.id] = sf.default_value
    } else {
      item[sf.id] = ""
    }
  }
  return item
}

/** Initial items for a repeater: min_items (default 1) empty items */
export function initialRepeaterItems(field: FieldConfig): RepeaterItem[] {
  const count = Math.max(field.min_items ?? 1, 1)
  return Array.from({ length: count }, () => emptyRepeaterItem(field))
}

/**
 * True when the respondent hasn't filled anything in the item — every value is
 * blank or still equal to its sub-field default. Such items are skipped by
 * validation and dropped on submit.
 */
export function isRepeaterItemEmpty(field: FieldConfig, item: RepeaterItem): boolean {
  const defaults = emptyRepeaterItem(field)
  return (field.sub_fields ?? []).every((sf) => {
    const v = item[sf.id]
    const d = defaults[sf.id]
    if (v === undefined) return true
    if (Array.isArray(v)) return v.length === 0 || (Array.isArray(d) && v.length === d.length && v.every((x, i) => x === d[i]))
    if (v.trim() === "") return true
    if (sf.type === "date" && sf.default_value === "__now__") return typeof d === "string" && v.slice(0, 10) === d.slice(0, 10)
    return v === d
  })
}

/** Error-map key for one sub-field of one item */
export function repeaterErrorKey(groupId: string, index: number, subId: string): string {
  return `${groupId}.${index}.${subId}`
}

// ─── Component ────────────────────────────────────────────────────────────────

let itemKeySeq = 0
const newItemKey = () => ++itemKeySeq

interface RepeaterFieldProps {
  field: FieldConfig
  value: RepeaterItem[]
  onChange: (items: RepeaterItem[], clearedErrorKeys: string[]) => void
  /** Group-level error (e.g. too few items) */
  error?: string
  errors: Record<string, string>
  /** Renders one sub-field input; `renderField` gets an id unique to this item */
  renderSubField: (
    renderField: FieldConfig,
    value: string | string[],
    onChange: (v: string | string[]) => void,
    error: string | undefined
  ) => ReactNode
}

export function RepeaterField({ field, value, onChange, error, errors, renderSubField }: RepeaterFieldProps) {
  const items = value
  const subFields = field.sub_fields ?? []
  const noun = repeaterItemNoun(field)
  const minItems = Math.max(field.min_items ?? 1, 0)
  const maxItems = field.max_items && field.max_items > 0 ? field.max_items : undefined
  const canAdd = maxItems === undefined || items.length < maxItems
  const canRemove = items.length > Math.max(minItems, 1)

  // Stable React keys per item so per-field local state (radio "other" text,
  // etc.) stays attached to the right card when items are removed.
  const [keys, setKeys] = useState<number[]>(() => items.map(() => newItemKey()))

  function groupErrorKeys(): string[] {
    const prefix = `${field.id}.`
    return [field.id, ...Object.keys(errors).filter((k) => k.startsWith(prefix))]
  }

  function addItem(copyFrom?: number) {
    if (!canAdd) return
    const fresh = copyFrom !== undefined ? { ...items[copyFrom] } : emptyRepeaterItem(field)
    const at = copyFrom !== undefined ? copyFrom + 1 : items.length
    const nextItems = [...items.slice(0, at), fresh, ...items.slice(at)]
    const key = newItemKey()
    setKeys((k) => [...k.slice(0, at), key, ...k.slice(at)])
    // Indices shift, so stale per-item errors no longer line up — clear them
    onChange(nextItems, groupErrorKeys())
  }

  function removeItem(index: number) {
    if (!canRemove) return
    setKeys((k) => k.filter((_, i) => i !== index))
    onChange(items.filter((_, i) => i !== index), groupErrorKeys())
  }

  function setSubValue(index: number, subId: string, v: string | string[]) {
    const nextItems = items.map((it, i) => (i === index ? { ...it, [subId]: v } : it))
    onChange(nextItems, [field.id, repeaterErrorKey(field.id, index, subId)])
  }

  const addLabel = field.add_button_label?.trim() || `הוסף ${noun}`

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-base font-medium text-neutral-800 leading-snug">
          {field.label}
          {field.required && <span className="text-red-500 ms-1 font-bold">*</span>}
        </Label>
        {field.placeholder && <p className="text-sm text-neutral-500">{field.placeholder}</p>}
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={keys[index] ?? `i${index}`}
            className="rounded-xl border border-neutral-200 bg-neutral-50/60 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-neutral-200 bg-white">
              <span className="text-sm font-semibold text-neutral-700 truncate">
                {repeaterItemTitle(field, item, index)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => addItem(index)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                    aria-label={`שכפל ${noun} ${index + 1}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">שכפל</span>
                  </button>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`מחק ${noun} ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">מחק</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5 p-4">
              {subFields.map((sf) => {
                const key = repeaterErrorKey(field.id, index, sf.id)
                const raw = item[sf.id]
                const v = raw ?? (sf.type === "multiselect" ? [] : "")
                return (
                  <div key={sf.id} id={`field-${key}`}>
                    {renderSubField(
                      { ...sf, id: `${field.id}-${index}-${sf.id}` },
                      v,
                      (nv) => setSubValue(index, sf.id, nv),
                      errors[key]
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {canAdd && (
        <button
          type="button"
          onClick={() => addItem()}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-600 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      )}
      {maxItems !== undefined && (
        <p className="text-xs text-neutral-400 text-center">
          {items.length} מתוך {maxItems} לכל היותר
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
