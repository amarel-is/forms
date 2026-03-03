"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FieldConfig } from "@/lib/types"

const OTHER_SENTINEL = "__other__"

interface DropdownFieldProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
}

export function DropdownField({ field, value, onChange, error }: DropdownFieldProps) {
  // When "other" was previously saved, split the stored "אחר: <text>" back out
  const isStoredOther = value.startsWith("אחר: ") || value === "אחר:"
  const [selectVal, setSelectVal] = useState(isStoredOther ? OTHER_SENTINEL : value)
  const [otherText, setOtherText] = useState(
    isStoredOther ? value.replace(/^אחר:\s*/, "") : ""
  )

  function handleSelectChange(v: string) {
    setSelectVal(v)
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

  const showOtherInput = field.allow_other && selectVal === OTHER_SENTINEL

  return (
    <div className="space-y-2">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && (
          <span className="text-red-500 ms-1 font-bold">*</span>
        )}
      </Label>

      <Select value={selectVal} onValueChange={handleSelectChange} dir="rtl">
        <SelectTrigger
          className={`h-12 rounded-xl text-base px-4 ${error ? "border-red-400" : ""}`}
        >
          <SelectValue placeholder="בחר אפשרות…" />
        </SelectTrigger>
        <SelectContent className="rounded-xl" dir="rtl">
          {(field.options ?? []).map((opt) => (
            <SelectItem
              key={opt}
              value={opt}
              className="text-base py-3 cursor-pointer"
            >
              {opt}
            </SelectItem>
          ))}
          {field.allow_other && (
            <SelectItem
              value={OTHER_SENTINEL}
              className="text-base py-3 cursor-pointer text-neutral-500 italic"
            >
              אחר…
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {showOtherInput && (
        <Input
          value={otherText}
          onChange={(e) => handleOtherTextChange(e.target.value)}
          placeholder="נא לפרט…"
          className={`h-12 rounded-xl text-base ${error ? "border-red-400" : ""}`}
          autoFocus
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
