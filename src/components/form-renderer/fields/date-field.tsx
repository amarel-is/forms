"use client"

import { Label } from "@/components/ui/label"
import type { FieldConfig } from "@/lib/types"

interface DateFieldProps {
  field: FieldConfig
  value: string          // ISO date string "YYYY-MM-DD"
  onChange: (value: string) => void
  error?: string
}

export function DateField({ field, value, onChange, error }: DateFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && (
          <span className="text-red-500 ms-1 font-bold">*</span>
        )}
      </Label>

      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full h-12 rounded-xl border px-4 text-base bg-white
          focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1
          transition-colors
          ${error ? "border-red-400" : "border-input"}
        `}
        dir="ltr"
      />

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
