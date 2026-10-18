"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { summarizeOpenEndedResponses, type AISummary } from "@/lib/actions/ai-insights"
import type { FieldConfig, FormResponse } from "@/lib/types"
import { isLayoutField } from "@/lib/types"
import { repeaterItems } from "@/lib/answer-format"

interface FieldStatsProps {
  fields: FieldConfig[]
  responses: FormResponse[]
}

export function FieldStats({ fields, responses }: FieldStatsProps) {
  if (fields.length === 0 || responses.length === 0) return null

  const inputFields = fields.filter((f) => !isLayoutField(f.type))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {inputFields.map((field) => (
        <FieldStatCard key={field.id} field={field} responses={responses} />
      ))}
    </div>
  )
}

function FieldStatCard({ field, responses }: { field: FieldConfig; responses: FormResponse[] }) {
  const total = responses.length

  // text: answered count + response rate
  if (field.type === "text") {
    return <TextStatCard field={field} responses={responses} total={total} />
  }

  // long_answer: answered count + avg length + AI button
  if (field.type === "long_answer") {
    return <LongAnswerStatCard field={field} responses={responses} total={total} />
  }

  // dropdown / multiselect / radio: option distribution
  if (field.type === "dropdown" || field.type === "multiselect" || field.type === "radio") {
    return <OptionDistributionCard field={field} responses={responses} total={total} />
  }

  // checkbox: true/false percentage
  if (field.type === "checkbox") {
    return <CheckboxStatCard field={field} responses={responses} total={total} />
  }

  // number: avg, min, max, median
  if (field.type === "number") {
    return <NumberStatCard field={field} responses={responses} total={total} />
  }

  // date: distribution by month
  if (field.type === "date") {
    return <DateStatCard field={field} responses={responses} total={total} />
  }

  // star_rating: avg + star distribution
  if (field.type === "star_rating") {
    return <StarRatingStatCard field={field} responses={responses} total={total} />
  }

  // entry_exit: entry/exit counts
  if (field.type === "entry_exit") {
    return <EntryExitStatCard field={field} responses={responses} total={total} />
  }

  // location: response count
  if (field.type === "location") {
    return <LocationStatCard field={field} responses={responses} total={total} />
  }

  // signature: signed count
  if (field.type === "signature") {
    return <SignatureStatCard field={field} responses={responses} total={total} />
  }

  if (field.type === "repeater") {
    return <RepeaterStatCards field={field} responses={responses} />
  }

  return null
}

// ─── Repeater: item totals + per-sub-field stats across all items ───────────

const REPEATER_STAT_SUB_TYPES = new Set(["dropdown", "radio", "multiselect", "checkbox", "number"])

function RepeaterStatCards({ field, responses }: { field: FieldConfig; responses: FormResponse[] }) {
  // Each item becomes its own pseudo-response so the regular cards can be reused
  const itemResponses: FormResponse[] = responses.flatMap((r) =>
    repeaterItems(r.data[field.id]).map((item, i) => ({
      id: `${r.id}-${i}`,
      form_id: r.form_id,
      data: item,
      submitted_at: r.submitted_at,
    }))
  )
  const withItems = responses.filter((r) => repeaterItems(r.data[field.id]).length > 0).length
  const avg = withItems > 0 ? itemResponses.length / withItems : 0
  const statSubs = (field.sub_fields ?? []).filter((sf) => REPEATER_STAT_SUB_TYPES.has(sf.type))
  const groupLabel = field.label || "קבוצה חוזרת"

  return (
    <>
      <StatCardShell label={groupLabel}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-neutral-900">{itemResponses.length}</p>
            <p className="text-xs text-neutral-500">{field.item_label?.trim() ? `סה״כ ${field.item_label.trim()}` : "סה״כ פריטים"}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{avg.toFixed(1)}</p>
            <p className="text-xs text-neutral-500">ממוצע לתגובה</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{withItems}</p>
            <p className="text-xs text-neutral-500">תגובות עם פריטים</p>
          </div>
        </div>
      </StatCardShell>
      {itemResponses.length > 0 &&
        statSubs.map((sf) => (
          <FieldStatCard
            key={sf.id}
            field={{ ...sf, label: `${groupLabel} › ${sf.label || "שדה"}` }}
            responses={itemResponses}
          />
        ))}
    </>
  )
}

// ─── Card wrapper ────────────────────────────────────────────────────────────

function StatCardShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-3">
        {label || "ללא שם"}
      </p>
      {children}
    </div>
  )
}

function ResponseBar({ pct, label }: { pct: number; label: string }) {
  return (
    <>
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-neutral-400 mt-1.5">{label}</p>
    </>
  )
}

// ─── Text field ──────────────────────────────────────────────────────────────

function TextStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const answered = responses.filter((r) => {
    const val = r.data[field.id]
    return val && (val as string).trim().length > 0
  }).length
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <StatCardShell label={field.label}>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-neutral-900">{answered}</span>
        <span className="text-sm text-neutral-400 mb-1">/ {total} ענו</span>
      </div>
      <ResponseBar pct={pct} label={`שיעור תגובה ${pct}%`} />
      <AISummaryButton formId="" fieldId={field.id} responses={responses} field={field} />
    </StatCardShell>
  )
}

// ─── Long Answer ─────────────────────────────────────────────────────────────

function LongAnswerStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const answered = responses.filter((r) => {
    const val = r.data[field.id]
    return val && (val as string).trim().length > 0
  })
  const pct = total > 0 ? Math.round((answered.length / total) * 100) : 0

  const avgLength = answered.length > 0
    ? Math.round(answered.reduce((sum, r) => sum + ((r.data[field.id] as string) ?? "").length, 0) / answered.length)
    : 0

  return (
    <StatCardShell label={field.label}>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-neutral-900">{answered.length}</span>
        <span className="text-sm text-neutral-400 mb-1">/ {total} ענו</span>
      </div>
      <ResponseBar pct={pct} label={`שיעור תגובה ${pct}% · אורך ממוצע ${avgLength} תווים`} />
      <AISummaryButton formId="" fieldId={field.id} responses={responses} field={field} />
    </StatCardShell>
  )
}

// ─── Option distribution (dropdown / multiselect / radio) ────────────────────

function OptionDistributionCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const countMap: Record<string, number> = {}

  responses.forEach((r) => {
    const val = r.data[field.id]
    if (!val) return
    if (Array.isArray(val)) {
      val.forEach((v) => { if (typeof v === "string") countMap[v] = (countMap[v] ?? 0) + 1 })
    } else {
      if (val) countMap[val] = (countMap[val] ?? 0) + 1
    }
  })

  const options = field.options ?? []
  const allKeys = new Set([...options, ...Object.keys(countMap)])
  const maxCount = Math.max(...Object.values(countMap), 1)

  return (
    <StatCardShell label={field.label}>
      <div className="space-y-3">
        {[...allKeys].map((opt) => {
          const count = countMap[opt] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const barPct = Math.round((count / maxCount) * 100)

          return (
            <div key={opt}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-neutral-700 truncate max-w-[70%]">{opt}</span>
                <span className="text-xs text-neutral-400 shrink-0 me-2">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-800 rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          )
        })}
        {allKeys.size === 0 && (
          <p className="text-xs text-neutral-400">לא הוגדרו אפשרויות</p>
        )}
      </div>
    </StatCardShell>
  )
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

function CheckboxStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const checked = responses.filter((r) => {
    const val = r.data[field.id]
    return val === "true" || String(val) === "true"
  }).length
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  return (
    <StatCardShell label={field.label}>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-neutral-900">{pct}%</span>
        <span className="text-sm text-neutral-400 mb-1">סימנו ({checked}/{total})</span>
      </div>
      <ResponseBar pct={pct} label={`${checked} סימנו מתוך ${total}`} />
    </StatCardShell>
  )
}

// ─── Number ──────────────────────────────────────────────────────────────────

function NumberStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const values = responses
    .map((r) => parseFloat(r.data[field.id] as string))
    .filter((v) => !isNaN(v))

  if (values.length === 0) {
    return (
      <StatCardShell label={field.label}>
        <p className="text-xs text-neutral-400">אין ערכים מספריים</p>
      </StatCardShell>
    )
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]

  return (
    <StatCardShell label={field.label}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-neutral-400">ממוצע</p>
          <p className="text-lg font-bold text-neutral-900">{avg.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">חציון</p>
          <p className="text-lg font-bold text-neutral-900">{median.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">מינימום</p>
          <p className="text-sm font-semibold text-neutral-700">{min}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">מקסימום</p>
          <p className="text-sm font-semibold text-neutral-700">{max}</p>
        </div>
      </div>
      <p className="text-xs text-neutral-400 mt-2">{values.length} ערכים מתוך {total}</p>
    </StatCardShell>
  )
}

// ─── Date ────────────────────────────────────────────────────────────────────

function DateStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const monthCounts: Record<string, number> = {}

  responses.forEach((r) => {
    const val = r.data[field.id] as string
    if (!val) return
    const d = new Date(val)
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthCounts[key] = (monthCounts[key] ?? 0) + 1
  })

  const sortedMonths = Object.entries(monthCounts).sort(([a], [b]) => a.localeCompare(b))
  const maxCount = Math.max(...Object.values(monthCounts), 1)
  const answered = Object.values(monthCounts).reduce((a, b) => a + b, 0)

  return (
    <StatCardShell label={field.label}>
      {sortedMonths.length === 0 ? (
        <p className="text-xs text-neutral-400">אין תאריכים</p>
      ) : (
        <div className="space-y-2">
          {sortedMonths.map(([month, count]) => {
            const barPct = Math.round((count / maxCount) * 100)
            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-700">{month}</span>
                  <span className="text-xs text-neutral-400">{count}</span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barPct}%` }} />
                </div>
              </div>
            )
          })}
          <p className="text-xs text-neutral-400 mt-1">{answered} מתוך {total}</p>
        </div>
      )}
    </StatCardShell>
  )
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRatingStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const values = responses
    .map((r) => parseInt(r.data[field.id] as string, 10))
    .filter((v) => !isNaN(v) && v >= 1 && v <= 5)

  if (values.length === 0) {
    return (
      <StatCardShell label={field.label}>
        <p className="text-xs text-neutral-400">אין דירוגים</p>
      </StatCardShell>
    )
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const dist = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: values.filter((v) => v === star).length,
  }))
  const maxCount = Math.max(...dist.map((d) => d.count), 1)

  return (
    <StatCardShell label={field.label}>
      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-neutral-900">{avg.toFixed(1)}</span>
        <span className="text-sm text-neutral-400 mb-1">⭐ ממוצע</span>
      </div>
      <div className="space-y-1.5">
        {dist.reverse().map(({ star, count }) => {
          const barPct = Math.round((count / maxCount) * 100)
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 w-4 shrink-0">{star}</span>
              <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${barPct}%` }} />
              </div>
              <span className="text-xs text-neutral-400 w-8 text-end shrink-0">{count}</span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-neutral-400 mt-2">{values.length} דירוגים מתוך {total}</p>
    </StatCardShell>
  )
}

// ─── Entry/Exit ──────────────────────────────────────────────────────────────

function EntryExitStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const entries = responses.filter((r) => r.data[field.id] === "כניסה").length
  const exits = responses.filter((r) => r.data[field.id] === "יציאה").length

  return (
    <StatCardShell label={field.label}>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{entries}</p>
          <p className="text-xs text-green-600">כניסות</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{exits}</p>
          <p className="text-xs text-red-600">יציאות</p>
        </div>
      </div>
      <p className="text-xs text-neutral-400 mt-2">{entries + exits} מתוך {total}</p>
    </StatCardShell>
  )
}

// ─── Location ────────────────────────────────────────────────────────────────

function LocationStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const answered = responses.filter((r) => {
    const val = r.data[field.id]
    return val && (val as string).trim().length > 0
  }).length
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <StatCardShell label={field.label}>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-neutral-900">{answered}</span>
        <span className="text-sm text-neutral-400 mb-1">שיתפו מיקום</span>
      </div>
      <ResponseBar pct={pct} label={`${pct}% מתוך ${total}`} />
    </StatCardShell>
  )
}

// ─── Signature ───────────────────────────────────────────────────────────────

function SignatureStatCard({ field, responses, total }: { field: FieldConfig; responses: FormResponse[]; total: number }) {
  const signed = responses.filter((r) => {
    const val = r.data[field.id]
    return val && (val as string).trim().length > 0
  }).length
  const pct = total > 0 ? Math.round((signed / total) * 100) : 0

  return (
    <StatCardShell label={field.label}>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-neutral-900">{signed}</span>
        <span className="text-sm text-neutral-400 mb-1">חתמו</span>
      </div>
      <ResponseBar pct={pct} label={`${pct}% מתוך ${total}`} />
    </StatCardShell>
  )
}

// ─── AI Summary Button ──────────────────────────────────────────────────────

function AISummaryButton({ fieldId, responses, field }: {
  formId: string
  fieldId: string
  responses: FormResponse[]
  field: FieldConfig
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AISummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const textAnswers = responses
    .map((r) => r.data[fieldId] as string)
    .filter((v) => v && v.trim().length > 0)

  if (textAnswers.length < 3) return null

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    const result = await summarizeOpenEndedResponses(textAnswers, field.label)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (result.summary) {
      setSummary(result.summary)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); if (!summary && !loading) handleAnalyze() }}
        className="mt-3 h-7 rounded-lg gap-1.5 text-[11px] w-full"
      >
        <Sparkles className="h-3 w-3" />
        ניתוח AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-violet-600" />
              ניתוח AI — {field.label}
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              <span className="text-sm text-neutral-500 ms-2">מנתח תשובות...</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 py-4">{error}</p>
          )}

          {summary && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase mb-1">סיכום</p>
                <p className="text-sm text-neutral-800 leading-relaxed">{summary.summary}</p>
              </div>

              {summary.topics.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase mb-1.5">נושאים עיקריים</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.topics.map((topic) => (
                      <Badge
                        key={topic}
                        className="text-xs rounded-lg bg-violet-50 text-violet-700 border-violet-200"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase mb-1">סנטימנט כללי</p>
                <Badge className={`text-xs rounded-lg ${
                  summary.sentiment === "positive" ? "bg-green-50 text-green-700 border-green-200" :
                  summary.sentiment === "negative" ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-neutral-50 text-neutral-600 border-neutral-200"
                }`}>
                  {summary.sentiment === "positive" ? "חיובי" :
                   summary.sentiment === "negative" ? "שלילי" : "ניטרלי"}
                </Badge>
              </div>

              <p className="text-xs text-neutral-400">מבוסס על {textAnswers.length} תשובות</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
