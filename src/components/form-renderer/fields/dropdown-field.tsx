"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FieldConfig } from "@/lib/types"

interface DropdownFieldProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
}

export function DropdownField({ field, value, onChange, error }: DropdownFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && (
          <span className="text-red-500 ms-1 font-bold">*</span>
        )}
      </Label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={`
            h-12              /* 48 px touch target */
            rounded-xl
            text-base          /* ≥16 px prevents iOS zoom */
            px-4
            ${error ? "border-red-400" : ""}
          `}
        >
          <SelectValue placeholder="בחר אפשרות…" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {(field.options ?? []).map((opt) => (
            <SelectItem
              key={opt}
              value={opt}
              className="text-base py-3 cursor-pointer"  /* bigger tap rows */
            >
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
