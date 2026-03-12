"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { FieldConfig } from "@/lib/types"

const OTHER_PREFIX = "אחר: "

interface MultiSelectFieldProps {
  field: FieldConfig
  value: string[]
  onChange: (value: string[]) => void
  error?: string
  resolvedOptions?: string[]
}

export function MultiSelectField({
  field,
  value,
  onChange,
  error,
  resolvedOptions,
}: MultiSelectFieldProps) {
  const otherEntry = value.find((v) => v.startsWith(OTHER_PREFIX) || v === "אחר:")
  const [otherChecked, setOtherChecked] = useState(!!otherEntry)
  const [otherText, setOtherText] = useState(
    otherEntry ? otherEntry.replace(/^אחר:\s*/, "") : ""
  )

  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  function handleOtherToggle() {
    if (otherChecked) {
      setOtherChecked(false)
      setOtherText("")
      onChange(value.filter((v) => !v.startsWith(OTHER_PREFIX) && v !== "אחר:"))
    } else {
      setOtherChecked(true)
    }
  }

  function handleOtherTextChange(text: string) {
    setOtherText(text)
    const without = value.filter((v) => !v.startsWith(OTHER_PREFIX) && v !== "אחר:")
    if (text) {
      onChange([...without, `${OTHER_PREFIX}${text}`])
    } else {
      onChange(without)
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
        {(resolvedOptions ?? field.options ?? []).map((opt) => {
          const selected = value.includes(opt)
          return (
            <label
              key={opt}
              dir="rtl"
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
              <span className="text-base text-neutral-800 leading-snug flex-1 text-right">
                {opt}
              </span>
            </label>
          )
        })}

        {field.allow_other && (
          <>
            <label
              dir="rtl"
              className={`
                flex items-center gap-4 py-4 px-4
                rounded-xl border-2 cursor-pointer
                transition-all duration-100 select-none
                active:scale-[0.99]
                ${
                  otherChecked
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white active:bg-neutral-50"
                }
              `}
            >
              <Checkbox
                checked={otherChecked}
                onCheckedChange={handleOtherToggle}
                className="h-5 w-5 rounded-md shrink-0"
              />
              <span className="text-base text-neutral-500 italic leading-snug flex-1 text-right">
                אחר…
              </span>
            </label>
            {otherChecked && (
              <Input
                value={otherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                placeholder="נא לפרט…"
                className={`h-12 rounded-xl text-base ${error ? "border-red-400" : ""}`}
                autoFocus
              />
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
