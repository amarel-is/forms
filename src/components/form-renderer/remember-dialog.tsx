"use client"

import { useState } from "react"
import { BookmarkCheck, Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { isLayoutField, type FieldConfig, type AnswerData, type AnswerValue } from "@/lib/types"
import { formatAnswerText } from "@/lib/answer-format"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormMemory {
  savedFieldIds: string[]
  values: AnswerData
}

// Field types that are meaningful to remember
const SAVEABLE_TYPES = new Set([
  "text", "long_answer", "number", "date",
  "dropdown", "radio", "multiselect", "checkbox", "star_rating",
])

export function isSaveableField(f: FieldConfig) {
  return !isLayoutField(f.type) && SAVEABLE_TYPES.has(f.type)
}

export const MEMORY_KEY = (formId: string) => `form_memory_${formId}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readMemory(formId: string): FormMemory | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(MEMORY_KEY(formId))
    return raw ? (JSON.parse(raw) as FormMemory) : null
  } catch {
    return null
  }
}

function formatPreview(val: AnswerValue): string {
  if (Array.isArray(val)) return formatAnswerText(undefined, val)
  return val === "true" ? "✓ מסומן" : val
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RememberDialogProps {
  open: boolean
  onClose: () => void
  formId: string
  fields: FieldConfig[]
  currentValues: AnswerData
}

export function RememberDialog({
  open,
  onClose,
  formId,
  fields,
  currentValues,
}: RememberDialogProps) {
  const saveableFields = fields.filter(isSaveableField)

  // Pre-populate from existing memory when the dialog opens
  const existing = readMemory(formId)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(existing?.savedFieldIds ?? [])
  )

  // Re-sync when dialog opens (in case memory changed externally)
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      const mem = readMemory(formId)
      setSelectedIds(new Set(mem?.savedFieldIds ?? []))
    }
  }

  const hasExistingMemory = !!existing && existing.savedFieldIds.length > 0

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    const ids = [...selectedIds]
    if (ids.length === 0) {
      // If nothing selected, clear memory entirely
      localStorage.removeItem(MEMORY_KEY(formId))
    } else {
      const memory: FormMemory = {
        savedFieldIds: ids,
        values: Object.fromEntries(
          ids.map((id) => [id, currentValues[id] ?? ""])
        ),
      }
      localStorage.setItem(MEMORY_KEY(formId), JSON.stringify(memory))
    }
    onClose()
  }

  function handleClear() {
    localStorage.removeItem(MEMORY_KEY(formId))
    setSelectedIds(new Set())
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-neutral-600 shrink-0" />
            <DialogTitle>זכור תשובות לפעם הבאה</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-1.5 text-right mt-1">
            <Shield className="h-3.5 w-3.5 shrink-0 text-green-500" />
            הנתונים נשמרים רק במכשיר זה ולא נשלחים לשרת
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {saveableFields.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">
            אין שדות שניתן לשמור בטופס זה
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto px-0.5 py-0.5">
            {saveableFields.map((field) => {
              const id = `remember-${field.id}`
              const val = currentValues[field.id]
              const hasValue =
                val !== undefined &&
                val !== "" &&
                !(Array.isArray(val) && val.length === 0)
              const preview = hasValue ? formatPreview(val) : null
              const isSelected = selectedIds.has(field.id)

              return (
                <label
                  key={field.id}
                  htmlFor={id}
                  className={`
                    flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer
                    transition-colors select-none
                    ${isSelected
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:bg-neutral-50"
                    }
                  `}
                >
                  <Checkbox
                    id={id}
                    checked={isSelected}
                    onCheckedChange={() => toggle(field.id)}
                    className="mt-0.5 h-4 w-4 rounded shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-800 leading-tight truncate">
                      {field.label || <span className="italic text-neutral-400">(ללא תווית)</span>}
                    </p>
                    {preview ? (
                      <p className="text-xs text-neutral-400 italic mt-0.5 truncate">
                        {preview.length > 42 ? preview.slice(0, 42) + "…" : preview}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-300 mt-0.5">לא מולא</p>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}

        <Separator />

        <DialogFooter className="flex flex-row items-center gap-2 sm:justify-between">
          <div>
            {hasExistingMemory && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8"
              >
                נקה זיכרון
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8"
            >
              ביטול
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-8"
              disabled={saveableFields.length === 0}
            >
              שמור
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
