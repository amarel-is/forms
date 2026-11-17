"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { History, Pencil, RotateCcw, Lock } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  getResponseHistory,
  restoreResponseVersion,
  updateResponse,
  type ResponseEdit,
} from "@/lib/actions/responses"
import type { AnswerData, AnswerValue, FieldConfig, FormResponse } from "@/lib/types"
import { isLayoutField, isRepeaterValue } from "@/lib/types"
import { formatAnswerText } from "@/lib/answer-format"

interface EditResponseDialogProps {
  response: FormResponse | null
  formId: string
  fields: FieldConfig[]
  extraKeys: string[]
  onClose: () => void
}

/** Field types that can't be safely edited as plain inputs — shown read-only and kept as-is. */
const READONLY_TYPES = new Set(["signature", "repeater"])

const SOURCE_LABEL: Record<ResponseEdit["source"], string> = {
  dashboard: "עריכה ידנית",
  restore: "שחזור גרסה",
  api: "מערכת / API",
}

const selectClass =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"

function sameValue(a: AnswerValue | undefined, b: AnswerValue | undefined): boolean {
  const norm = (v: AnswerValue | undefined) => (v === undefined || v === null ? "" : JSON.stringify(v))
  return norm(a) === norm(b)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function EditResponseDialog(props: EditResponseDialogProps) {
  // Keyed by response so every opened submission starts from fresh state.
  return <EditResponseDialogInner key={props.response?.id ?? "closed"} {...props} />
}

function EditResponseDialogInner({ response, formId, fields, extraKeys, onClose }: EditResponseDialogProps) {
  const router = useRouter()
  const [tab, setTab] = useState<"edit" | "history">("edit")
  const [draft, setDraft] = useState<AnswerData>(() => ({ ...(response?.data ?? {}) }))
  const [edits, setEdits] = useState<ResponseEdit[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isSaving, startSave] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const inputFields = useMemo(() => fields.filter((f) => !isLayoutField(f.type)), [fields])

  useEffect(() => {
    if (!response) return
    let cancelled = false
    getResponseHistory(response.id, formId).then((res) => {
      if (cancelled) return
      if (res.error) setHistoryError(res.error)
      setEdits(res.edits)
    })
    return () => {
      cancelled = true
    }
  }, [response, formId])

  const labelFor = (key: string) => fields.find((f) => f.id === key)?.label || key

  const patch: AnswerData = useMemo(() => {
    if (!response) return {}
    const out: AnswerData = {}
    for (const [key, val] of Object.entries(draft)) {
      if (!sameValue(val, response.data[key])) out[key] = val
    }
    return out
  }, [draft, response])
  const changedCount = Object.keys(patch).length

  function setValue(key: string, value: AnswerValue) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function handleSave() {
    if (!response || changedCount === 0) return
    startSave(async () => {
      const res = await updateResponse(response.id, formId, patch)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("התגובה עודכנה — הגרסה הקודמת נשמרה ביומן השינויים")
      router.refresh()
      onClose()
    })
  }

  async function handleRestore(editId: string) {
    setRestoringId(editId)
    const res = await restoreResponseVersion(editId, formId)
    setRestoringId(null)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("הגרסה שוחזרה")
    router.refresh()
    onClose()
  }

  function renderEditor(field: FieldConfig) {
    const value = draft[field.id]
    const str = typeof value === "string" ? value : ""

    if (READONLY_TYPES.has(field.type) || isRepeaterValue(value)) {
      return (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="whitespace-pre-line">
            {field.type === "signature"
              ? value ? "חתימה קיימת — לא ניתנת לעריכה" : "אין חתימה"
              : formatAnswerText(field, value) || "—"}
            {field.type === "repeater" && <span className="block mt-1">שדה זה לא ניתן לעריכה מכאן</span>}
          </span>
        </div>
      )
    }

    switch (field.type) {
      case "long_answer":
        return <Textarea dir="rtl" value={str} onChange={(e) => setValue(field.id, e.target.value)} rows={3} />
      case "number":
        return (
          <Input
            type="number"
            dir="rtl"
            value={str}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        )
      case "date":
        return (
          <Input
            type={(field.date_mode ?? "date") === "datetime" ? "datetime-local" : "date"}
            value={str}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        )
      case "checkbox":
        return (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-orange-600"
              checked={str === "true"}
              onChange={(e) => setValue(field.id, e.target.checked ? "true" : "")}
            />
            {field.placeholder || "מסומן"}
          </label>
        )
      case "entry_exit":
        return (
          <select className={selectClass} value={str} onChange={(e) => setValue(field.id, e.target.value)}>
            <option value="">—</option>
            <option value="כניסה">כניסה</option>
            <option value="יציאה">יציאה</option>
          </select>
        )
      case "star_rating":
        return (
          <select className={selectClass} value={str} onChange={(e) => setValue(field.id, e.target.value)}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>{"★".repeat(n)} ({n})</option>
            ))}
          </select>
        )
      case "dropdown":
      case "radio": {
        const options = field.options ?? []
        // Dataset-backed or "other" answers may not be in the static list — keep them selectable.
        const all = str && !options.includes(str) ? [str, ...options] : options
        if (all.length === 0) {
          return <Input dir="rtl" value={str} onChange={(e) => setValue(field.id, e.target.value)} />
        }
        return (
          <select className={selectClass} value={str} onChange={(e) => setValue(field.id, e.target.value)}>
            <option value="">—</option>
            {all.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )
      }
      case "multiselect": {
        const selected = Array.isArray(value) ? (value as string[]) : str ? [str] : []
        const options = field.options ?? []
        const all = [...options, ...selected.filter((s) => !options.includes(s))]
        if (all.length === 0) return <span className="text-xs text-neutral-400">אין אפשרויות</span>
        return (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {all.map((o) => (
              <label key={o} className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-orange-600"
                  checked={selected.includes(o)}
                  onChange={(e) =>
                    setValue(
                      field.id,
                      e.target.checked ? [...selected, o] : selected.filter((s) => s !== o)
                    )
                  }
                />
                {o}
              </label>
            ))}
          </div>
        )
      }
      default:
        return <Input dir="rtl" value={str} onChange={(e) => setValue(field.id, e.target.value)} />
    }
  }

  return (
    <Dialog open={!!response} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="text-right">
          <DialogTitle>עריכת תגובה</DialogTitle>
          <DialogDescription>
            {response && <>נשלחה ב-{formatTime(response.submitted_at)} · </>}
            כל שינוי נשמר ביומן השינויים וניתן לשחזור
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === "edit" ? "border-orange-600 text-orange-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            עריכה
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === "history" ? "border-orange-600 text-orange-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            היסטוריית שינויים
            {edits && edits.length > 0 && (
              <span className="rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-600">{edits.length}</span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          {tab === "edit" ? (
            <div className="space-y-4 py-2">
              {inputFields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
                    {f.label || "ללא שם"}
                    {response && !sameValue(draft[f.id], response.data[f.id]) && (
                      <span className="rounded bg-orange-50 px-1.5 text-[10px] font-normal text-orange-700">שונה</span>
                    )}
                  </label>
                  {renderEditor(f)}
                </div>
              ))}
              {extraKeys.map((key) => {
                const v = draft[key]
                const editable = v === undefined || typeof v === "string"
                return (
                  <div key={`extra-${key}`} className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600">
                      {key} <span className="font-normal text-neutral-400">(API)</span>
                    </label>
                    {editable ? (
                      <Input dir="rtl" value={(v as string | undefined) ?? ""} onChange={(e) => setValue(key, e.target.value)} />
                    ) : (
                      <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                        {formatAnswerText(undefined, v)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-2">
              {edits === null ? (
                <div className="text-muted-foreground text-sm">טוען נתונים...</div>
              ) : historyError ? (
                <div className="text-sm text-red-600">{historyError}</div>
              ) : edits.length === 0 ? (
                <div className="text-center py-10 text-sm text-neutral-400">התגובה לא נערכה מאז שנשלחה</div>
              ) : (
                <ol className="space-y-3">
                  {edits
                    .filter((e) => e.action === "update")
                    .map((e) => (
                      <li key={e.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="text-xs text-neutral-500">
                            <span className="font-medium text-neutral-700">{formatTime(e.created_at)}</span>
                            {" · "}
                            {SOURCE_LABEL[e.source]}
                            {e.edited_by_email && <> · {e.edited_by_email}</>}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-lg shrink-0"
                            disabled={restoringId !== null}
                            onClick={() => handleRestore(e.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            {restoringId === e.id ? "משחזר..." : "שחזר לפני שינוי זה"}
                          </Button>
                        </div>
                        <ul className="space-y-1.5">
                          {e.changed_keys.map((key) => {
                            const field = fields.find((f) => f.id === key)
                            const before = formatAnswerText(field, e.old_data?.[key])
                            const after = formatAnswerText(field, e.new_data?.[key])
                            return (
                              <li key={key} className="text-sm">
                                <span className="font-medium text-neutral-700">{labelFor(key)}: </span>
                                <span className="text-red-600 line-through decoration-red-300">{before || "ריק"}</span>
                                <span className="mx-1.5 text-neutral-400">←</span>
                                <span className="text-emerald-700">{after || "ריק"}</span>
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {tab === "edit" && (
          <DialogFooter className="flex-row-reverse sm:justify-start gap-2 border-t border-neutral-100 pt-3">
            <Button
              onClick={handleSave}
              disabled={isSaving || changedCount === 0}
              className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl"
            >
              {isSaving ? "שומר..." : changedCount > 0 ? `שמור ${changedCount} שינויים` : "שמור"}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={isSaving}>
              ביטול
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
