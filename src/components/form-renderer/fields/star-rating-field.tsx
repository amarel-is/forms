"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Label } from "@/components/ui/label"
import type { FieldConfig } from "@/lib/types"

interface StarRatingFieldProps {
  field: FieldConfig
  value: string          // "1"–"5", or "" for no selection
  onChange: (value: string) => void
  error?: string
}

export function StarRatingField({ field, value, onChange, error }: StarRatingFieldProps) {
  const [hovered, setHovered] = useState(0)
  const selected = parseInt(value) || 0

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && (
          <span className="text-red-500 ms-1 font-bold">*</span>
        )}
      </Label>

      <fieldset
        className="flex gap-1 border-none p-0 m-0"
        dir="ltr"
        onMouseLeave={() => setHovered(0)}
      >
        <legend className="sr-only">{field.label}</legend>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= (hovered || selected)
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onClick={() => onChange(value === String(star) ? "" : String(star))}
              className="p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none"
              aria-label={`${star} כוכבים`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  active
                    ? "fill-amber-400 text-amber-400"
                    : "fill-transparent text-neutral-300"
                }`}
              />
            </button>
          )
        })}
      </fieldset>

      {selected > 0 && (
        <p className="text-xs text-neutral-400">
          {selected === 1 && "גרוע"}
          {selected === 2 && "לא טוב"}
          {selected === 3 && "בסדר"}
          {selected === 4 && "טוב"}
          {selected === 5 && "מצוין"}
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
