"use client"

import { useRef, useState, useTransition } from "react"
import {
  Plus, X, ImageIcon, LogIn, LogOut, Link2, PenLine,
  Upload, Loader2, Star,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  isLayoutField,
  type FieldConfig,
  type TextValidationType,
} from "@/lib/types"
import { VALIDATION_PRESETS } from "@/lib/field-validation"
import { uploadFormImage } from "@/lib/actions/storage"

const TYPE_LABEL: Record<FieldConfig["type"], string> = {
  text: "תשובה קצרה",
  long_answer: "תשובה ארוכה",
  number: "מספר",
  date: "תאריך",
  dropdown: "רשימה נפתחת",
  multiselect: "בחירה מרובה",
  checkbox: "צ'קבוקס",
  star_rating: "דירוג כוכבים",
  entry_exit: "כניסה / יציאה",
  signature: "חתימה",
  heading: "כותרת ראשית",
  subheading: "כותרת משנה",
  paragraph: "פסקת טקסט",
  divider: "קו הפרדה",
  image: "תמונה",
  link: "לינק",
}

interface FieldEditorPanelProps {
  field: FieldConfig
  onChange: (updated: FieldConfig) => void
}

export function FieldEditorPanel({ field, onChange }: FieldEditorPanelProps) {
  const [newOption, setNewOption] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const layout = isLayoutField(field.type)

  function update(patch: Partial<FieldConfig>) {
    onChange({ ...field, ...patch })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    const fd = new FormData()
    fd.append("file", file)
    startTransition(async () => {
      const result = await uploadFormImage(fd)
      if (result.error) {
        setUploadError(result.error)
      } else if (result.url) {
        update({ content: result.url })
      }
      if (fileInputRef.current) fileInputRef.current.value = ""
    })
  }

  function addOption() {
    const trimmed = newOption.trim()
    if (!trimmed) return
    const options = [...(field.options ?? []), trimmed]
    update({ options })
    setNewOption("")
  }

  function removeOption(index: number) {
    const options = (field.options ?? []).filter((_, i) => i !== index)
    // Also clear default_value if it was this option
    const removed = field.options?.[index]
    const newDefault =
      typeof field.default_value === "string" && field.default_value === removed
        ? undefined
        : Array.isArray(field.default_value)
        ? (field.default_value as string[]).filter((v) => v !== removed)
        : field.default_value
    update({ options, default_value: newDefault })
  }

  function handleOptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      addOption()
    }
  }

  function toggleMultiselectDefault(opt: string) {
    const current = (field.default_value as string[]) ?? []
    const next = current.includes(opt)
      ? current.filter((v) => v !== opt)
      : [...current, opt]
    update({ default_value: next.length > 0 ? next : undefined })
  }

  const hasOptions = field.type === "dropdown" || field.type === "multiselect"

  // ── Sections that have a default-value control ────────────────────────────
  const hasDefaultValue =
    !layout &&
    !["entry_exit", "signature", "star_rating"].includes(field.type)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">הגדרות שדה</h3>
        <Badge
          variant="outline"
          className={`text-xs rounded-lg ${
            layout
              ? "bg-violet-50 text-violet-600 border-violet-200"
              : "bg-neutral-50 text-neutral-600"
          }`}
        >
          {TYPE_LABEL[field.type]}
        </Badge>
      </div>

      <Separator />

      {/* ── Layout field editors ─────────────────────────────────────── */}

      {field.type === "heading" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
            טקסט הכותרת
          </Label>
          <Textarea
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="הכנס כותרת ראשית…"
            rows={2}
            className="text-sm rounded-xl resize-none"
          />
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <p className="text-2xl font-bold text-neutral-900 leading-tight">
              {field.label || "כותרת ראשית"}
            </p>
          </div>
        </div>
      )}

      {field.type === "subheading" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
            טקסט הכותרת
          </Label>
          <Textarea
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="הכנס כותרת משנה…"
            rows={2}
            className="text-sm rounded-xl resize-none"
          />
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <p className="text-lg font-semibold text-neutral-800 leading-tight">
              {field.label || "כותרת משנה"}
            </p>
          </div>
        </div>
      )}

      {field.type === "paragraph" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              תוכן הפסקה
            </Label>
            <Textarea
              value={field.content ?? ""}
              onChange={(e) => update({ content: e.target.value })}
              placeholder="הכנס את תוכן הפסקה כאן…"
              rows={5}
              className="text-sm rounded-xl resize-y"
            />
          </div>
          {(field.content ?? "").length > 0 && (
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {field.content}
              </p>
            </div>
          )}
        </>
      )}

      {field.type === "divider" && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
            תווית (אופציונלי)
          </Label>
          <Input
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="לדוגמה: פרטים נוספים"
            className="h-9 rounded-xl text-sm"
          />
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-neutral-200" />
            {field.label && (
              <span className="text-xs text-neutral-400 shrink-0">{field.label}</span>
            )}
            <div className="flex-1 h-px bg-neutral-200" />
          </div>
        </div>
      )}

      {field.type === "link" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              טקסט הקישור
            </Label>
            <Input
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="לדוגמה: לחץ כאן"
              className="h-9 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              כתובת URL
            </Label>
            <Input
              value={field.content ?? ""}
              onChange={(e) => update({ content: e.target.value })}
              placeholder="https://..."
              className="h-9 rounded-xl text-sm"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              תיאור (אופציונלי)
            </Label>
            <Input
              value={field.placeholder ?? ""}
              onChange={(e) => update({ placeholder: e.target.value })}
              placeholder="טקסט תיאור מתחת לקישור"
              className="h-9 rounded-xl text-sm"
            />
          </div>
          {field.content && (
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <Link2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-600 underline">
                  {field.label || "לינק"}
                </span>
              </div>
              {field.placeholder && (
                <p className="text-xs text-neutral-400">{field.placeholder}</p>
              )}
            </div>
          )}
        </>
      )}

      {field.type === "signature" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              תווית
            </Label>
            <Input
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="לדוגמה: חתימה"
              className="h-9 rounded-xl text-sm"
            />
          </div>
          <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
            <div className="h-28 flex flex-col items-center justify-center gap-2 text-neutral-300">
              <PenLine className="h-7 w-7" />
              <span className="text-xs">שטח חתימה — יופיע בטופס</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-700">שדה חובה</p>
              <p className="text-xs text-neutral-400">החתימה נדרשת</p>
            </div>
            <Checkbox
              checked={field.required}
              onCheckedChange={(checked) => update({ required: checked === true })}
              className="rounded-md"
            />
          </div>
        </>
      )}

      {field.type === "image" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              העלאת תמונה
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-5 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span className="text-xs font-medium">
                {isPending ? "מעלה..." : "לחץ לבחירת קובץ"}
              </span>
              <span className="text-[11px] text-neutral-300">JPG, PNG, GIF, WEBP, SVG · עד 5MB</span>
            </button>
            {uploadError && (
              <p className="text-xs text-red-500 text-right">{uploadError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              או הכנס כתובת URL
            </Label>
            <Input
              value={field.content ?? ""}
              onChange={(e) => update({ content: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="h-9 rounded-xl text-sm"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              טקסט חלופי (Alt)
            </Label>
            <Input
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="תיאור התמונה לנגישות"
              className="h-9 rounded-xl text-sm"
            />
          </div>
          <div className="bg-neutral-50 rounded-xl border border-neutral-100 overflow-hidden">
            {(field.content ?? "").length > 4 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={field.content}
                alt={field.label || "תצוגה מקדימה"}
                className="w-full max-h-40 object-cover"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = "none"
                  ;(e.currentTarget.nextSibling as HTMLElement | null)?.classList.remove("hidden")
                }}
              />
            ) : null}
            <div
              className={`flex items-center justify-center py-6 text-neutral-400 ${
                (field.content ?? "").length > 4 ? "hidden" : ""
              }`}
            >
              <ImageIcon className="h-6 w-6 me-2" />
              <span className="text-xs">תצוגה מקדימה תופיע כאן</span>
            </div>
          </div>
        </>
      )}

      {/* ── Input field editors ──────────────────────────────────────── */}

      {field.type === "entry_exit" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              תווית
            </Label>
            <Input
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="לדוגמה: סטטוס"
              className="h-9 rounded-xl text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2} />
              <span className="text-sm font-semibold text-green-700">כניסה</span>
            </div>
            <div className="flex-1 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4 text-red-600 shrink-0" strokeWidth={2} />
              <span className="text-sm font-semibold text-red-700">יציאה</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400 text-center">המשיב יבחר בין כניסה ליציאה</p>
        </>
      )}

      {!layout && field.type !== "entry_exit" && (
        <>
          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              תווית
            </Label>
            <Input
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder={
                field.type === "checkbox"
                  ? "לדוגמה: אני מסכים לתנאי השימוש"
                  : "לדוגמה: מה שמך?"
              }
              className="h-9 rounded-xl text-sm"
            />
          </div>

          {/* Placeholder — text, long_answer, number */}
          {(field.type === "text" || field.type === "long_answer" || field.type === "number") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                טקסט כוונון
              </Label>
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) => update({ placeholder: e.target.value })}
                placeholder="לדוגמה: הקלד תשובתך…"
                className="h-9 rounded-xl text-sm"
              />
            </div>
          )}

          {/* Number: min / max / step */}
          {field.type === "number" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                טווח ערכים
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className="text-[11px] text-neutral-400 text-center">מינימום</p>
                  <Input
                    type="number"
                    value={field.min ?? ""}
                    onChange={(e) =>
                      update({ min: e.target.value !== "" ? Number(e.target.value) : undefined })
                    }
                    placeholder="—"
                    className="h-9 rounded-xl text-sm text-center"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-neutral-400 text-center">מקסימום</p>
                  <Input
                    type="number"
                    value={field.max ?? ""}
                    onChange={(e) =>
                      update({ max: e.target.value !== "" ? Number(e.target.value) : undefined })
                    }
                    placeholder="—"
                    className="h-9 rounded-xl text-sm text-center"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-neutral-400 text-center">צעד</p>
                  <Input
                    type="number"
                    value={field.step ?? ""}
                    onChange={(e) =>
                      update({ step: e.target.value !== "" ? Number(e.target.value) : undefined })
                    }
                    placeholder="1"
                    className="h-9 rounded-xl text-sm text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Validation (text only) */}
          {field.type === "text" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                ולידציה
              </Label>
              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    "none",
                    "numbers_only",
                    "text_only",
                    "phone_il",
                    "id_il",
                    "custom_regex",
                  ] as TextValidationType[]
                ).map((vtype) => {
                  const preset = VALIDATION_PRESETS[vtype]
                  const isActive = (field.validation?.type ?? "none") === vtype
                  return (
                    <button
                      key={vtype}
                      type="button"
                      onClick={() =>
                        update({
                          validation:
                            vtype === "none"
                              ? undefined
                              : { type: vtype, custom_pattern: field.validation?.custom_pattern },
                        })
                      }
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-start transition-all ${
                        isActive
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          isActive
                            ? "border-neutral-900 bg-neutral-900"
                            : "border-neutral-300"
                        }`}
                      >
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-800 leading-tight">
                          {preset.label}
                        </p>
                        <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {field.validation?.type === "custom_regex" && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                    תבנית Regex
                  </Label>
                  <Input
                    value={field.validation.custom_pattern ?? ""}
                    onChange={(e) =>
                      update({
                        validation: {
                          type: "custom_regex",
                          custom_pattern: e.target.value,
                        },
                      })
                    }
                    placeholder="לדוגמה: ^\d{4}$"
                    className="h-9 rounded-xl text-sm font-mono"
                    dir="ltr"
                  />
                  {field.validation.custom_pattern && (
                    <p className="text-xs text-neutral-400">
                      בדיקה:{" "}
                      <span className="font-mono text-neutral-600">
                        {(() => {
                          try {
                            new RegExp(field.validation.custom_pattern)
                            return "✅ תבנית תקינה"
                          } catch {
                            return "❌ תבנית לא תקינה"
                          }
                        })()}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Options (dropdown / multiselect) */}
          {hasOptions && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                אפשרויות
              </Label>

              {(field.options ?? []).length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                  {(field.options ?? []).map((opt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-neutral-50 rounded-lg px-3 py-2"
                    >
                      <span className="flex-1 text-sm text-neutral-700 truncate">{opt}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="text-neutral-300 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={handleOptionKeyDown}
                  placeholder="הוסף אפשרות…"
                  className="h-9 rounded-xl text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addOption}
                  className="h-9 w-9 rounded-xl shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {(field.options ?? []).length === 0 && (
                <p className="text-xs text-neutral-400">לחץ Enter או + להוספת אפשרויות</p>
              )}

              {/* Allow other — dropdown only */}
              {field.type === "dropdown" && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                  <div>
                    <p className="text-sm font-medium text-neutral-700">אפשרות &quot;אחר&quot;</p>
                    <p className="text-xs text-neutral-400">מאפשר למשיב לרשום ערך חופשי</p>
                  </div>
                  <Checkbox
                    checked={field.allow_other ?? false}
                    onCheckedChange={(checked) =>
                      update({ allow_other: checked === true ? true : undefined })
                    }
                    className="rounded-md"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Default value ──────────────────────────────────────────── */}
          {hasDefaultValue && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                ערך ברירת מחדל
              </Label>

              {/* text / long_answer */}
              {(field.type === "text" || field.type === "long_answer") && (
                <Input
                  value={(field.default_value as string) ?? ""}
                  onChange={(e) =>
                    update({ default_value: e.target.value || undefined })
                  }
                  placeholder="ערך שיופיע מראש…"
                  className="h-9 rounded-xl text-sm"
                />
              )}

              {/* number */}
              {field.type === "number" && (
                <Input
                  type="number"
                  value={(field.default_value as string) ?? ""}
                  onChange={(e) =>
                    update({ default_value: e.target.value || undefined })
                  }
                  placeholder="מספר ברירת מחדל…"
                  className="h-9 rounded-xl text-sm"
                  min={field.min}
                  max={field.max}
                />
              )}

              {/* date */}
              {field.type === "date" && (
                <input
                  type="date"
                  value={(field.default_value as string) ?? ""}
                  onChange={(e) =>
                    update({ default_value: e.target.value || undefined })
                  }
                  className="w-full h-9 rounded-xl border border-input px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1"
                  dir="ltr"
                />
              )}

              {/* dropdown — only show when options exist */}
              {field.type === "dropdown" && (field.options ?? []).length > 0 && (
                <Select
                  value={(field.default_value as string) ?? "__none__"}
                  onValueChange={(v) =>
                    update({ default_value: v === "__none__" ? undefined : v })
                  }
                  dir="rtl"
                >
                  <SelectTrigger className="h-9 rounded-xl text-sm">
                    <SelectValue placeholder="ללא ברירת מחדל" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="__none__" className="text-neutral-400 italic">
                      ללא ברירת מחדל
                    </SelectItem>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* multiselect — only show when options exist */}
              {field.type === "multiselect" && (field.options ?? []).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {(field.options ?? []).map((opt) => {
                    const checkId = `default-ms-${field.id}-${opt}`
                    const selected = ((field.default_value as string[]) ?? []).includes(opt)
                    return (
                      <label
                        key={opt}
                        htmlFor={checkId}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 cursor-pointer"
                      >
                        <Checkbox
                          id={checkId}
                          checked={selected}
                          onCheckedChange={() => toggleMultiselectDefault(opt)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm text-neutral-700">{opt}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* checkbox */}
              {field.type === "checkbox" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <Checkbox
                    checked={field.default_value === true}
                    onCheckedChange={(checked) =>
                      update({ default_value: checked === true ? true : undefined })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm text-neutral-600">מסומן כברירת מחדל</span>
                </div>
              )}

              {/* Star rating default */}
              {field.type === "star_rating" && (
                <div className="flex gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (parseInt(field.default_value as string) || 0)
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          update({
                            default_value:
                              field.default_value === String(star)
                                ? undefined
                                : String(star),
                          })
                        }
                        className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400"
                              : "fill-transparent text-neutral-300"
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Required */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-700">שדה חובה</p>
              <p className="text-xs text-neutral-400">
                {field.type === "checkbox"
                  ? "המשיב חייב לסמן את התיבה"
                  : "המשיבים חייבים לענות על שדה זה"}
              </p>
            </div>
            <Checkbox
              checked={field.required}
              onCheckedChange={(checked) => update({ required: checked === true })}
              className="rounded-md"
            />
          </div>
        </>
      )}
    </div>
  )
}
