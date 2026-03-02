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

export function MultiSelectField({
  field,
  value,
  onChange,
  error,
}: MultiSelectFieldProps) {
  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && (
          <span className="text-red-500 ms-1 font-bold">*</span>
        )}
      </Label>

      <div className="space-y-2.5">
        {(field.options ?? []).map((opt) => {
          const selected = value.includes(opt)
          return (
            /*
             * The entire row is the tap target — at least 52px tall via py-4.
             * This satisfies Apple's 44px minimum with comfortable margin.
             */
            <label
              key={opt}
              className={`
                flex items-center gap-4 py-4 px-4
                rounded-xl border-2 cursor-pointer
                transition-all duration-100 select-none
                active:scale-[0.99]
                ${
                  selected
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white active:bg-neutral-50"
                }
              `}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => toggle(opt)}
                className="h-5 w-5 rounded-md shrink-0"
              />
              <span className="text-base text-neutral-800 leading-snug flex-1">
                {opt}
              </span>
            </label>
          )
        })}
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
