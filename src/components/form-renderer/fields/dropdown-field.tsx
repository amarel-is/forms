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
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-neutral-800">
        {field.label}
        {field.required && <span className="text-red-500 ms-1">*</span>}
      </Label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`h-10 rounded-xl text-sm ${error ? "border-red-500" : ""}`}>
          <SelectValue placeholder="בחר אפשרות…" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
