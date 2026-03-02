"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { FieldConfig } from "@/lib/types"

interface FieldEditorPanelProps {
  field: FieldConfig
  onChange: (updated: FieldConfig) => void
}

const TYPE_LABEL = {
  text: "טקסט",
  dropdown: "רשימה נפתחת",
  multiselect: "בחירה מרובה",
}

export function FieldEditorPanel({ field, onChange }: FieldEditorPanelProps) {
  const [newOption, setNewOption] = useState("")

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
        <Badge variant="secondary" className="text-xs rounded-lg">
          {TYPE_LABEL[field.type]}
        </Badge>
      </div>

      <Separator />

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
            placeholder="לדוגמה: הקלד את תשובתך כאן…"
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
            <p className="text-xs text-neutral-400">
              לחץ Enter או + כדי להוסיף אפשרויות
            </p>
          )}
        </div>
      )}

      <Separator />

      {/* Required toggle */}
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
    </div>
  )
}
