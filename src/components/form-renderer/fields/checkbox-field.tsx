"use client"

import { Checkbox } from "@/components/ui/checkbox"
import type { FieldConfig } from "@/lib/types"

interface CheckboxFieldProps {
  field: FieldConfig
  value: string          // "true" when checked, "" when unchecked
  onChange: (value: string) => void
  error?: string
}

export function CheckboxField({ field, value, onChange, error }: CheckboxFieldProps) {
  const checked = value === "true"
  const inputId = `checkbox-${field.id}`

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        dir="rtl"
        className={`
          flex items-center gap-4 py-4 px-4
          rounded-xl border-2 cursor-pointer
          transition-all duration-100 select-none
          active:scale-[0.99]
          ${checked
            ? "border-neutral-900 bg-neutral-50"
            : "border-neutral-200 bg-white active:bg-neutral-50"
          }
          ${error ? "border-red-400" : ""}
        `}
      >
        <Checkbox
          id={inputId}
          checked={checked}
          onCheckedChange={(c) => onChange(c === true ? "true" : "")}
          className="h-5 w-5 rounded-md shrink-0"
        />
        <span className="text-base text-neutral-800 leading-snug flex-1 text-right">
          {field.label}
          {field.required && <span className="text-red-500 ms-1 font-bold">*</span>}
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
