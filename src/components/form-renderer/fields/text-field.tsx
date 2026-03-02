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
  const isLong = field.label.length > 50 || (field.placeholder ?? "").length > 50

  return (
    <div className="space-y-2">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && (
          <span className="text-red-500 ms-1 font-bold">*</span>
        )}
      </Label>

      {isLong ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "תשובתך…"}
          rows={4}
          className={`
            rounded-xl resize-none
            text-base          /* ≥16 px — prevents iOS Safari auto-zoom */
            min-h-[100px]
            px-4 py-3
            ${error ? "border-red-400 focus-visible:ring-red-400" : ""}
          `}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "תשובתך…"}
          className={`
            h-12              /* 48 px — exceeds Apple 44 px minimum tap target */
            rounded-xl
            text-base          /* ≥16 px — prevents iOS Safari auto-zoom */
            px-4
            ${error ? "border-red-400 focus-visible:ring-red-400" : ""}
          `}
        />
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
