"use client"

import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { FieldConfig } from "@/lib/types"

interface MultiSelectFieldProps {
  field: FieldConfig
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}

export function MultiSelectField({ field, value, onChange, error }: MultiSelectFieldProps) {
  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-neutral-800">
        {field.label}
        {field.required && <span className="text-red-500 ms-1">*</span>}
      </Label>

      <div className="space-y-2">
        {(field.options ?? []).map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              value.includes(opt)
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <Checkbox
              checked={value.includes(opt)}
              onCheckedChange={() => toggle(opt)}
              className="rounded-md"
            />
            <span className="text-sm text-neutral-700">{opt}</span>
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
