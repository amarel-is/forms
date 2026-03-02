"use client"

import { LogIn, LogOut } from "lucide-react"
import { Label } from "@/components/ui/label"
import type { FieldConfig } from "@/lib/types"

interface EntryExitFieldProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
}

export function EntryExitField({ field, value, onChange, error }: EntryExitFieldProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium text-neutral-800 leading-snug">
        {field.label}
        {field.required && <span className="text-red-500 ms-1 font-bold">*</span>}
      </Label>

      <div className="grid grid-cols-2 gap-3">
        {/* Entry — כניסה */}
        <button
          type="button"
          onClick={() => onChange("כניסה")}
          className={`
            relative flex flex-col items-center justify-center gap-3
            rounded-2xl border-2 py-7 px-4
            transition-all duration-150 cursor-pointer
            active:scale-[0.97] touch-manipulation
            ${
              value === "כניסה"
                ? "border-green-500 bg-green-50 shadow-md shadow-green-100"
                : "border-neutral-200 bg-white active:bg-green-50/40"
            }
          `}
        >
          <div
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center
              transition-colors duration-150
              ${value === "כניסה" ? "bg-green-100" : "bg-neutral-100"}
            `}
          >
            <LogIn
              className={`h-6 w-6 transition-colors ${
                value === "כניסה" ? "text-green-600" : "text-neutral-400"
              }`}
              strokeWidth={2}
            />
          </div>

          <span
            className={`text-lg font-bold leading-none ${
              value === "כניסה" ? "text-green-700" : "text-neutral-500"
            }`}
          >
            כניסה
          </span>

          {value === "כניסה" && (
            <span className="absolute top-3 start-3 w-2.5 h-2.5 rounded-full bg-green-500" />
          )}
        </button>

        {/* Exit — יציאה */}
        <button
          type="button"
          onClick={() => onChange("יציאה")}
          className={`
            relative flex flex-col items-center justify-center gap-3
            rounded-2xl border-2 py-7 px-4
            transition-all duration-150 cursor-pointer
            active:scale-[0.97] touch-manipulation
            ${
              value === "יציאה"
                ? "border-red-500 bg-red-50 shadow-md shadow-red-100"
                : "border-neutral-200 bg-white active:bg-red-50/40"
            }
          `}
        >
          <div
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center
              transition-colors duration-150
              ${value === "יציאה" ? "bg-red-100" : "bg-neutral-100"}
            `}
          >
            <LogOut
              className={`h-6 w-6 transition-colors ${
                value === "יציאה" ? "text-red-600" : "text-neutral-400"
              }`}
              strokeWidth={2}
            />
          </div>

          <span
            className={`text-lg font-bold leading-none ${
              value === "יציאה" ? "text-red-700" : "text-neutral-500"
            }`}
          >
            יציאה
          </span>

          {value === "יציאה" && (
            <span className="absolute top-3 start-3 w-2.5 h-2.5 rounded-full bg-red-500" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
