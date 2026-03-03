"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { FieldConfig } from "@/lib/types"

interface NumberFieldProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
}

export function NumberField({ field, value, onChange, error }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && (
          <span className="text-red-500 ms-1 font-bold">*</span>
        )}
      </Label>

      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? ""}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        className={`h-12 rounded-xl text-base ${error ? "border-red-400" : ""}`}
        dir="ltr"
      />

      {(field.min !== undefined || field.max !== undefined) && (
        <p className="text-xs text-neutral-400">
          {field.min !== undefined && field.max !== undefined
            ? `ערך בין ${field.min} ל-${field.max}`
            : field.min !== undefined
            ? `מינימום: ${field.min}`
            : `מקסימום: ${field.max}`}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
