"use client"

import { useState } from "react"
import { Plus, X, ImageIcon, LogIn, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { isLayoutField, type FieldConfig } from "@/lib/types"

const TYPE_LABEL: Record<FieldConfig["type"], string> = {
  text: "טקסט",
  dropdown: "רשימה נפתחת",
  multiselect: "בחירה מרובה",
  entry_exit: "כניסה / יציאה",
  heading: "כותרת ראשית",
  subheading: "כותרת משנה",
  paragraph: "פסקת טקסט",
  divider: "קו הפרדה",
  image: "תמונה",
}

interface FieldEditorPanelProps {
  field: FieldConfig
  onChange: (updated: FieldConfig) => void
}

export function FieldEditorPanel({ field, onChange }: FieldEditorPanelProps) {
  const [newOption, setNewOption] = useState("")
  const layout = isLayoutField(field.type)

  function update(patch: Partial<FieldConfig>) {
    onChange({ ...field, ...patch })
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
    update({ options })
  }

  function handleOptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      addOption()
    }
  }

  const hasOptions = field.type === "dropdown" || field.type === "multiselect"

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

      {field.type === "image" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
              כתובת URL של התמונה
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

          {/* Preview */}
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
              placeholder="לדוגמה: מה שמך?"
              className="h-9 rounded-xl text-sm"
            />
          </div>

          {/* Placeholder (text only) */}
          {field.type === "text" && (
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

          {/* Options */}
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
            </div>
          )}

          <Separator />

          {/* Required */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-700">שדה חובה</p>
              <p className="text-xs text-neutral-400">המשיבים חייבים לענות על שדה זה</p>
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
