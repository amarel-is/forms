"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { FieldConfig } from "@/lib/types"

const OTHER_SENTINEL = "__other__"

interface RadioFieldProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  resolvedOptions?: string[]
}

export function RadioField({ field, value, onChange, error, resolvedOptions }: RadioFieldProps) {
  const isStoredOther = value.startsWith("אחר: ") || value === "אחר:"
  const [selectedVal, setSelectedVal] = useState(isStoredOther ? OTHER_SENTINEL : value)
  const [otherText, setOtherText] = useState(
    isStoredOther ? value.replace(/^אחר:\s*/, "") : ""
  )

  function handleSelect(v: string) {
    setSelectedVal(v)
    if (v === OTHER_SENTINEL) {
      onChange(otherText ? `אחר: ${otherText}` : "")
    } else {
      setOtherText("")
      onChange(v)
    }
  }

  function handleOtherTextChange(text: string) {
    setOtherText(text)
    onChange(text ? `אחר: ${text}` : "")
  }

  const showOtherInput = field.allow_other && selectedVal === OTHER_SENTINEL

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
          const selected = selectedVal === opt
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
              <span
                className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  selected ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                }`}
              >
                {selected && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              <span className="text-base text-neutral-800 leading-snug flex-1 text-right">
                {opt}
              </span>
              <input
                type="radio"
                name={`radio-${field.id}`}
                value={opt}
                checked={selected}
                onChange={() => handleSelect(opt)}
                className="sr-only"
              />
            </label>
          )
        })}

        {field.allow_other && (
          <label
            dir="rtl"
            className={`
              flex items-center gap-4 py-4 px-4
              rounded-xl border-2 cursor-pointer
              transition-all duration-100 select-none
              active:scale-[0.99]
              ${
                selectedVal === OTHER_SENTINEL
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white active:bg-neutral-50"
              }
            `}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                selectedVal === OTHER_SENTINEL ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
              }`}
            >
              {selectedVal === OTHER_SENTINEL && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
            <span className="text-base text-neutral-500 italic leading-snug flex-1 text-right">
              אחר…
            </span>
            <input
              type="radio"
              name={`radio-${field.id}`}
              value={OTHER_SENTINEL}
              checked={selectedVal === OTHER_SENTINEL}
              onChange={() => handleSelect(OTHER_SENTINEL)}
              className="sr-only"
            />
          </label>
        )}

        {showOtherInput && (
          <Input
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            placeholder="נא לפרט…"
            className={`h-12 rounded-xl text-base ${error ? "border-red-400" : ""}`}
            autoFocus
          />
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
