"use client"

import { nanoid } from "nanoid"
import { CheckCircle2, Plus, Trash2, Database, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { isLayoutField, type FieldConfig, type FormDataset, type ThankYouRecapBlock } from "@/lib/types"

interface ThankYouDesignerProps {
  submitMessage: string
  onSubmitMessageChange: (v: string) => void
  thankYouMessage: string
  onThankYouMessageChange: (v: string) => void
  recaps: ThankYouRecapBlock[]
  onRecapsChange: (r: ThankYouRecapBlock[]) => void
  fields: FieldConfig[]
  datasets?: FormDataset[]
  formType: string
  afterSubmit: "thank_you" | "redirect"
  onEnableThankYou: () => void
}

/** Render a template string into preview nodes, showing {{label}} as a chip. */
function previewNodes(text: string) {
  const parts = text.split(/(\{\{[^}]*\}\})/g)
  return parts.map((part, i) => {
    const m = part.match(/^\{\{([^}]*)\}\}$/)
    if (m) {
      return (
        <span
          key={i}
          className="inline-block rounded-md bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[0.85em] font-medium mx-0.5 align-middle"
        >
          {m[1]}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function ThankYouDesigner({
  submitMessage,
  onSubmitMessageChange,
  thankYouMessage,
  onThankYouMessageChange,
  recaps,
  onRecapsChange,
  fields,
  datasets,
  formType,
  afterSubmit,
  onEnableThankYou,
}: ThankYouDesignerProps) {
  const inputFields = fields.filter((f) => !isLayoutField(f.type) && f.label)
  // Fields whose options come from a dataset — the only ones a recap can resolve.
  const datasetFields = inputFields.filter((f) => f.data_source?.dataset_id)

  const headingPlaceholder =
    formType === "attendance" ? "הדיווח נקלט בהצלחה!" : "תודה על תגובתך!"

  function insertVariable(label: string) {
    const sep =
      thankYouMessage && !thankYouMessage.endsWith(" ") && !thankYouMessage.endsWith("\n")
        ? " "
        : ""
    onThankYouMessageChange(thankYouMessage + sep + `{{${label}}}`)
  }

  function addRecap() {
    const first = datasetFields[0]
    if (!first) return
    const ds = datasets?.find((d) => d.id === first.data_source!.dataset_id)
    onRecapsChange([
      ...recaps,
      {
        id: nanoid(8),
        title: "",
        source_field_id: first.id,
        column_ids: ds?.columns.slice(0, 2).map((c) => c.id) ?? [],
        layout: "list",
        footer: "",
      },
    ])
  }

  function updateRecap(id: string, patch: Partial<ThankYouRecapBlock>) {
    onRecapsChange(recaps.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRecap(id: string) {
    onRecapsChange(recaps.filter((r) => r.id !== id))
  }

  return (
    <div className="h-full overflow-y-auto" dir="rtl">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {afterSubmit === "redirect" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 shrink-0" />
              עמוד התודה כבוי — הטופס מפנה ל-URL חיצוני לאחר השליחה.
            </span>
            <button
              type="button"
              onClick={onEnableThankYou}
              className="shrink-0 font-medium text-amber-800 underline hover:no-underline"
            >
              הפעל עמוד תודה
            </button>
          </div>
        )}

        {/* ── Live preview ── */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="px-4 py-2 border-b border-neutral-100 text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
            תצוגה מקדימה
          </div>
          <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1.5">
              {submitMessage.trim() ? previewNodes(submitMessage) : headingPlaceholder}
            </h2>
            {thankYouMessage.trim() ? (
              <p className="text-sm text-neutral-600 whitespace-pre-wrap leading-relaxed max-w-md">
                {previewNodes(thankYouMessage)}
              </p>
            ) : (
              <p className="text-sm text-neutral-400">תגובתך נקלטה בהצלחה.</p>
            )}

            {recaps.map((block) => (
              <RecapPreview key={block.id} block={block} fields={fields} datasets={datasets} />
            ))}
          </div>
        </div>

        {/* ── Message editor ── */}
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-card p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">כותרת</Label>
            <Input
              value={submitMessage}
              onChange={(e) => onSubmitMessageChange(e.target.value)}
              placeholder={headingPlaceholder}
              className="h-10 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">תוכן ההודעה</Label>
            <Textarea
              value={thankYouMessage}
              onChange={(e) => onThankYouMessageChange(e.target.value)}
              placeholder={"היי {{שם מלא}}\nתודה רבה על הרשמתך!\nנתראה ב: {{מיקום האירוע}}"}
              className="rounded-xl text-sm min-h-[110px]"
            />
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              השאר ריק להודעת ברירת המחדל. תומך ב-Markdown (הדגשות, קישורים, רשימות).
            </p>
          </div>

          {inputFields.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-neutral-500">הוסף ערך מתוך תשובות הטופס</Label>
              <div className="flex flex-wrap gap-1">
                {inputFields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => insertVariable(f.label)}
                    className="text-[11px] px-2 py-1 rounded-md bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    {`{{${f.label}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Dataset recap blocks ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              סיכום פריטים מהמאגר
            </Label>
            <button
              type="button"
              onClick={addRecap}
              disabled={datasetFields.length === 0}
              className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 disabled:text-neutral-300 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              הוסף בלוק
            </button>
          </div>

          {datasetFields.length === 0 ? (
            <p className="text-[11px] text-neutral-400 leading-relaxed rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center">
              כדי להציג פריטים מהמאגר, הוסף קודם שדה בחירה (רשימה / רב-בחירה) שמבוסס על מאגר מידע.
            </p>
          ) : (
            recaps.map((block) => {
              const field = fields.find((f) => f.id === block.source_field_id)
              const ds = datasets?.find((d) => d.id === field?.data_source?.dataset_id)
              return (
                <div key={block.id} className="rounded-xl border border-neutral-200 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-600">בלוק סיכום</span>
                    <button
                      type="button"
                      onClick={() => removeRecap(block.id)}
                      className="text-neutral-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-neutral-500">לפי השדה</Label>
                    <Select
                      value={block.source_field_id}
                      onValueChange={(v) => {
                        const f = fields.find((x) => x.id === v)
                        const nextDs = datasets?.find((d) => d.id === f?.data_source?.dataset_id)
                        updateRecap(block.id, {
                          source_field_id: v,
                          column_ids: nextDs?.columns.slice(0, 2).map((c) => c.id) ?? [],
                        })
                      }}
                      dir="rtl"
                    >
                      <SelectTrigger className="h-9 rounded-xl text-xs">
                        <SelectValue placeholder="בחר שדה" />
                      </SelectTrigger>
                      <SelectContent>
                        {datasetFields.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {ds && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-neutral-500">עמודות להצגה</Label>
                      <div className="space-y-1.5 rounded-lg border border-neutral-200 p-2 bg-neutral-50">
                        {ds.columns.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                            <Checkbox
                              checked={block.column_ids.includes(c.id)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...block.column_ids, c.id]
                                  : block.column_ids.filter((x) => x !== c.id)
                                updateRecap(block.id, { column_ids: next })
                              }}
                            />
                            {c.name}
                            {c.type === "image" && <span className="text-[10px] text-neutral-400">(תמונה)</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-neutral-500">כותרת (אופ׳)</Label>
                      <Input
                        value={block.title ?? ""}
                        onChange={(e) => updateRecap(block.id, { title: e.target.value })}
                        placeholder="הפריטים שבחרת"
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-neutral-500">תצוגה</Label>
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1 text-[11px]">
                        {(["list", "table"] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => updateRecap(block.id, { layout: l })}
                            className={`rounded-md py-1 transition-colors ${
                              (block.layout ?? "list") === l
                                ? "bg-white shadow-sm font-medium text-neutral-900"
                                : "text-neutral-500 hover:text-neutral-700"
                            }`}
                          >
                            {l === "list" ? "רשימה" : "טבלה"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-neutral-500">הערה בתחתית (אופ׳)</Label>
                    <Input
                      value={block.footer ?? ""}
                      onChange={(e) => updateRecap(block.id, { footer: e.target.value })}
                      placeholder="הפריטים יגיעו בקרוב"
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

/** Small sample preview of a recap block, using the first few dataset rows. */
function RecapPreview({
  block,
  fields,
  datasets,
}: {
  block: ThankYouRecapBlock
  fields: FieldConfig[]
  datasets?: FormDataset[]
}) {
  const field = fields.find((f) => f.id === block.source_field_id)
  const ds = datasets?.find((d) => d.id === field?.data_source?.dataset_id)
  if (!ds || block.column_ids.length === 0) return null

  const cols = block.column_ids
    .map((id) => ds.columns.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
  if (cols.length === 0) return null

  const rows = ds.rows.slice(0, 2)
  if (rows.length === 0) return null

  return (
    <div className="w-full max-w-sm mt-5 text-right">
      {block.title && <h3 className="text-sm font-semibold text-neutral-800 mb-1.5">{block.title}</h3>}
      <ul className="space-y-1.5">
        {rows.map((row, i) => (
          <li key={i} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 flex items-center gap-2">
            {cols.map((c) =>
              c.type === "image" ? (
                <img key={c.id} src={String(row[c.id] ?? "")} alt="" className="h-9 w-9 rounded-md object-cover border border-neutral-200 shrink-0" />
              ) : (
                <span key={c.id} className="text-xs text-neutral-700 truncate">{String(row[c.id] ?? "—")}</span>
              )
            )}
          </li>
        ))}
      </ul>
      {block.footer && <p className="text-xs text-neutral-500 mt-1.5">{block.footer}</p>}
      <p className="text-[10px] text-neutral-300 mt-1">לדוגמה — יוצג לפי בחירת המשתמש</p>
    </div>
  )
}
