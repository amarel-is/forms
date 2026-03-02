"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { FieldConfig } from "@/lib/types"

interface TextFieldProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
}

export function TextField({ field, value, onChange, error }: TextFieldProps) {
  const isLong =
    (field.placeholder ?? "").length > 60 || field.label.length > 60

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-neutral-800">
        {field.label}
        {field.required && <span className="text-red-500 ms-1">*</span>}
      </Label>

      {isLong ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "תשובתך…"}
          rows={3}
          className={`rounded-xl resize-none text-sm ${
            error ? "border-red-500 focus-visible:ring-red-500" : ""
          }`}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "תשובתך…"}
          className={`h-10 rounded-xl text-sm ${
            error ? "border-red-500 focus-visible:ring-red-500" : ""
          }`}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
