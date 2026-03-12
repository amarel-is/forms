"use client"

import { useState } from "react"
import { Plus, X, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type FieldConfig,
  type FieldCondition,
  type ConditionRule,
  type ConditionOperator,
  type FormDataset,
} from "@/lib/types"
import {
  getConditionSources,
  getOperatorsForField,
  OPERATOR_META,
} from "@/lib/conditions"

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConditionEditorProps {
  field: FieldConfig
  allFields: FieldConfig[]
  onChange: (conditions: FieldCondition | undefined) => void
  datasets?: FormDataset[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyRule(): ConditionRule {
  return { fieldId: "", operator: "equals", value: "" }
}

function emptyCondition(): FieldCondition {
  return { match: "all", rules: [emptyRule()] }
}

// ─── Value input — context-sensitive ─────────────────────────────────────────

function RuleValueInput({
  rule,
  sourceField,
  onChange,
  datasets,
}: {
  rule: ConditionRule
  sourceField: FieldConfig | undefined
  onChange: (value: string) => void
  datasets?: FormDataset[]
}) {
  const meta = OPERATOR_META[rule.operator]
  if (!meta.hasValueInput) return null
  if (!sourceField) return null

  if (rule.dataset_column && sourceField.data_source && datasets) {
    const ds = datasets.find((d) => d.id === sourceField.data_source!.dataset_id)
    if (ds) {
      const uniqueVals = [...new Set(
        ds.rows.map((r) => String(r[rule.dataset_column!] ?? "")).filter(Boolean)
      )]
      if (uniqueVals.length > 0) {
        return (
          <Select value={rule.value ?? ""} onValueChange={onChange} dir="rtl">
            <SelectTrigger className="h-9 rounded-lg text-sm flex-1 min-w-0">
              <SelectValue placeholder="בחר ערך…" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {uniqueVals.map((v) => (
                <SelectItem key={v} value={v} className="text-sm">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
      return (
        <Input
          value={rule.value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ערך…"
          className="h-9 rounded-lg text-sm flex-1 min-w-0"
        />
      )
    }
  }

  if (
    (sourceField.type === "dropdown" || sourceField.type === "radio" || sourceField.type === "multiselect") &&
    (sourceField.options ?? []).length > 0
  ) {
    return (
      <Select value={rule.value ?? ""} onValueChange={onChange} dir="rtl">
        <SelectTrigger className="h-9 rounded-lg text-sm flex-1 min-w-0">
          <SelectValue placeholder="בחר ערך…" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {(sourceField.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (sourceField.type === "checkbox") {
    return (
      <div className="flex gap-1.5 flex-1">
        {(["true", ""] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
              (rule.value ?? "") === v
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
            }`}
          >
            {v === "true" ? "מסומן" : "לא מסומן"}
          </button>
        ))}
      </div>
    )
  }

  if (sourceField.type === "entry_exit") {
    return (
      <div className="flex gap-1.5 flex-1">
        {(["כניסה", "יציאה"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
              rule.value === v
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    )
  }

  if (sourceField.type === "date") {
    return (
      <input
        type="date"
        value={rule.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 min-w-0 rounded-lg border border-input px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
        dir="ltr"
      />
    )
  }

  if (sourceField.type === "number" || sourceField.type === "star_rating") {
    return (
      <Input
        type="number"
        value={rule.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ערך…"
        className="h-9 rounded-lg text-sm flex-1 min-w-0"
        min={sourceField.type === "star_rating" ? 1 : undefined}
        max={sourceField.type === "star_rating" ? 5 : undefined}
        dir="ltr"
      />
    )
  }

  return (
    <Input
      value={rule.value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="ערך…"
      className="h-9 rounded-lg text-sm flex-1 min-w-0"
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConditionEditor({ field, allFields, onChange, datasets = [] }: ConditionEditorProps) {
  const [open, setOpen] = useState(false)
  const sources = getConditionSources(field.id, allFields)
  const cond = field.conditions

  function getSource(fieldId: string): FieldConfig | undefined {
    return sources.find((f) => f.id === fieldId)
  }

  function updateRule(index: number, patch: Partial<ConditionRule>) {
    if (!cond) return
    const newRules = cond.rules.map((r, i) =>
      i === index ? { ...r, ...patch } : r
    )
    if (patch.operator && !OPERATOR_META[patch.operator].hasValueInput) {
      newRules[index] = { ...newRules[index], value: undefined }
    }
    onChange({ ...cond, rules: newRules })
  }

  function updateRuleField(index: number, newFieldId: string) {
    if (!cond) return
    const newSource = getSource(newFieldId)
    const defaultOperator = newSource
      ? getOperatorsForField(newSource)[0]
      : "equals"
    const newRules = cond.rules.map((r, i) =>
      i === index
        ? { fieldId: newFieldId, operator: defaultOperator, value: undefined, dataset_column: undefined }
        : r
    )
    onChange({ ...cond, rules: newRules })
  }

  function addRule() {
    if (cond) {
      onChange({ ...cond, rules: [...cond.rules, emptyRule()] })
    } else {
      onChange(emptyCondition())
    }
  }

  function removeRule(index: number) {
    if (!cond) return
    const newRules = cond.rules.filter((_, i) => i !== index)
    if (newRules.length === 0) {
      onChange(undefined)
    } else {
      onChange({ ...cond, rules: newRules })
    }
  }

  function setMatch(match: "all" | "any") {
    if (cond) onChange({ ...cond, match })
  }

  const ruleCount = cond?.rules.length ?? 0
  const hasConditions = ruleCount > 0

  // ── Compact inline summary ─────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className={`h-3.5 w-3.5 shrink-0 ${hasConditions ? "text-blue-500" : "text-neutral-400"}`} />
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              לוגיקה מותנית
            </Label>
          </div>
          {hasConditions && (
            <Badge variant="outline" className="text-[10px] rounded-md bg-blue-50 text-blue-600 border-blue-200">
              {ruleCount} {ruleCount === 1 ? "תנאי" : "תנאים"}
            </Badge>
          )}
        </div>

        {hasConditions ? (
          <div className="space-y-1.5">
            {cond!.rules.slice(0, 2).map((rule, i) => {
              const src = getSource(rule.fieldId)
              const colName = rule.dataset_column
                ? datasets.find((d) => d.id === src?.data_source?.dataset_id)
                    ?.columns.find((c) => c.id === rule.dataset_column)?.name
                : null
              return (
                <div key={i} className="text-[11px] text-neutral-500 bg-neutral-50 rounded-lg px-2.5 py-1.5 truncate">
                  {src?.label || "?"}{" "}
                  {colName && <span className="text-blue-500">→ {colName}</span>}{" "}
                  {OPERATOR_META[rule.operator]?.label}{" "}
                  {rule.value && <span className="font-medium text-neutral-700">&quot;{rule.value}&quot;</span>}
                </div>
              )
            })}
            {ruleCount > 2 && (
              <p className="text-[10px] text-neutral-400 ps-2">+{ruleCount - 2} תנאים נוספים</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            שדה זה תמיד מוצג. הוסף תנאי כדי לשלוט בהצגה.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (!hasConditions) addRule()
            setOpen(true)
          }}
          disabled={sources.length === 0}
          className="h-8 rounded-xl text-xs gap-1.5 w-full border-dashed"
        >
          <GitBranch className="h-3.5 w-3.5" />
          {hasConditions ? "ערוך תנאים" : "הוסף תנאי"}
        </Button>
        {sources.length === 0 && (
          <p className="text-[11px] text-neutral-300 text-center">
            הוסף שדות נוספים לטופס כדי ליצור תנאים
          </p>
        )}
      </div>

      {/* ── Dialog — full condition editor ──────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4.5 w-4.5 text-blue-500" />
              לוגיקה מותנית — {field.label || "שדה"}
            </DialogTitle>
          </DialogHeader>

          {cond && cond.rules.length > 0 && (
            <div className="space-y-4 mt-2">
              {/* Match selector */}
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <span>הצג שדה זה כאשר</span>
                <div className="flex border border-neutral-200 rounded-lg overflow-hidden">
                  {(["all", "any"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMatch(m)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        cond.match === m
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-500 hover:bg-neutral-50"
                      }`}
                    >
                      {m === "all" ? "כל" : "אחד"}
                    </button>
                  ))}
                </div>
                <span>מהתנאים מתקיימים:</span>
              </div>

              {/* Rules */}
              <div className="flex flex-col gap-3">
                {cond.rules.map((rule, i) => {
                  const sourceField = getSource(rule.fieldId)
                  const operators = sourceField ? getOperatorsForField(sourceField) : []

                  return (
                    <div
                      key={i}
                      className="bg-neutral-50 rounded-xl p-3 space-y-2.5 border border-neutral-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400 font-medium">תנאי {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeRule(i)}
                          className="text-neutral-300 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Row 1: Field + Operator */}
                      <div className="flex gap-2">
                        <Select
                          value={rule.fieldId || "__none__"}
                          onValueChange={(v) => updateRuleField(i, v === "__none__" ? "" : v)}
                          dir="rtl"
                        >
                          <SelectTrigger className="h-9 rounded-lg text-sm flex-1 min-w-0 bg-white">
                            <SelectValue placeholder="בחר שדה…" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="__none__" className="text-sm text-neutral-400 italic">בחר שדה…</SelectItem>
                            {sources.map((src) => (
                              <SelectItem key={src.id} value={src.id} className="text-sm">
                                {src.label || `(שדה ${src.type})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {sourceField && (
                          <Select
                            value={rule.operator}
                            onValueChange={(v) => updateRule(i, { operator: v as ConditionOperator })}
                            dir="rtl"
                          >
                            <SelectTrigger className="h-9 rounded-lg text-sm w-32 shrink-0 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {operators.map((op) => (
                                <SelectItem key={op} value={op} className="text-sm">
                                  {OPERATOR_META[op].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Row 2: Dataset column (if applicable) + Value */}
                      {sourceField && (
                        <div className="flex gap-2">
                          {sourceField.data_source && datasets.length > 0 && (() => {
                            const ds = datasets.find((d) => d.id === sourceField.data_source!.dataset_id)
                            if (!ds || ds.columns.length === 0) return null
                            return (
                              <Select
                                value={rule.dataset_column ?? "__direct__"}
                                onValueChange={(v) =>
                                  updateRule(i, {
                                    dataset_column: v === "__direct__" ? undefined : v,
                                    value: undefined,
                                  })
                                }
                                dir="rtl"
                              >
                                <SelectTrigger className="h-9 rounded-lg text-sm w-36 shrink-0 bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="__direct__" className="text-sm">ערך ישיר</SelectItem>
                                  {ds.columns.map((col) => (
                                    <SelectItem key={col.id} value={col.id} className="text-sm">
                                      {col.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          })()}

                          <RuleValueInput
                            rule={rule}
                            sourceField={sourceField}
                            onChange={(v) => updateRule(i, { value: v })}
                            datasets={datasets}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add rule */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                className="h-9 rounded-xl text-xs gap-1.5 w-full"
              >
                <Plus className="h-3.5 w-3.5" />
                הוסף תנאי
              </Button>

              {/* Clear all */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { onChange(undefined); setOpen(false) }}
                className="h-8 rounded-xl text-xs text-red-500 hover:text-red-600 hover:bg-red-50 w-full"
              >
                <X className="h-3.5 w-3.5" />
                הסר את כל התנאים
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
