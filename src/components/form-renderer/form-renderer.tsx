"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, CheckCircle2, LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextField } from "./fields/text-field"
import { DropdownField } from "./fields/dropdown-field"
import { MultiSelectField } from "./fields/multiselect-field"
import { EntryExitField } from "./fields/entry-exit-field"
import {
  HeadingElement,
  SubheadingElement,
  ParagraphElement,
  DividerElement,
  ImageElement,
} from "./fields/layout-elements"
import { submitResponse } from "@/lib/actions/responses"
import { isLayoutField, type FieldConfig, type Form } from "@/lib/types"

interface FormRendererProps {
  form: Form
}

type FormValues = Record<string, string | string[]>
type FormErrors = Record<string, string>

export function FormRenderer({ form }: FormRendererProps) {
  // Only input fields participate in form state
  const inputFields = form.fields.filter((f) => !isLayoutField(f.type))

  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {}
    inputFields.forEach((f) => {
      initial[f.id] = f.type === "multiselect" ? [] : ""
    })
    return initial
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submitButtonLabel =
    form.settings?.submit_label?.trim() ||
    (form.form_type === "attendance" ? "שלח דיווח" : "שלח")

  function setValue(fieldId: string, val: string | string[]) {
    setValues((prev) => ({ ...prev, [fieldId]: val }))
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}
    inputFields.forEach((f) => {
      if (!f.required) return
      const val = values[f.id]
      if (f.type === "multiselect") {
        if ((val as string[]).length === 0)
          newErrors[f.id] = "אנא בחר לפחות אפשרות אחת"
      } else {
        if (!val || (val as string).trim() === "")
          newErrors[f.id] = "שדה זה הוא חובה"
      }
    })
    setErrors(newErrors)

    const firstErrorId = Object.keys(newErrors)[0]
    if (firstErrorId) {
      document.getElementById(`field-${firstErrorId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const result = await submitResponse(form.id, values)
      if (result.error) {
        toast.error(result.error)
      } else {
        setSubmitted(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    } catch {
      toast.error("אירעה שגיאה. אנא נסה שוב.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const direction = Object.entries(values).find(
      ([, v]) => v === "כניסה" || v === "יציאה"
    )?.[1] as string | undefined
    const isEntry = direction === "כניסה"

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
            isEntry ? "bg-green-100" : direction === "יציאה" ? "bg-red-100" : "bg-neutral-100"
          }`}
        >
          <CheckCircle2
            className={`h-10 w-10 ${
              isEntry ? "text-green-600" : direction === "יציאה" ? "text-red-500" : "text-neutral-700"
            }`}
          />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          {form.settings?.submit_message ?? "תודה!"}
        </h2>
        <div className="flex items-center gap-2 text-base text-neutral-500">
          {direction && (
            isEntry
              ? <LogIn className="h-5 w-5 text-green-500 shrink-0" />
              : <LogOut className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <span>
            {direction
              ? isEntry
                ? "כניסתך נרשמה בהצלחה."
                : "יציאתך נרשמה בהצלחה."
              : "תגובתך נקלטה בהצלחה."}
          </span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6 mb-8">
        {form.fields.map((field) => (
          <div key={field.id} id={`field-${field.id}`}>
            <FieldRenderer
              field={field}
              value={isLayoutField(field.type) ? "" : values[field.id]}
              error={errors[field.id]}
              onChange={(val) => setValue(field.id, val)}
            />
          </div>
        ))}
      </div>

      {/* Desktop submit */}
      <div className="hidden sm:block">
        <Button
          type="submit"
          className="w-full h-12 rounded-xl font-semibold text-base"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : submitButtonLabel}
        </Button>
      </div>

      {/* Mobile sticky submit */}
      <div
        className="sm:hidden fixed bottom-0 start-0 end-0 z-20 px-4 bg-white/95 backdrop-blur-md border-t border-neutral-200"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="pt-3">
          <Button
            type="submit"
            className="w-full h-14 rounded-2xl font-bold text-base shadow-sm"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : submitButtonLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

function FieldRenderer({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldConfig
  value: string | string[]
  error?: string
  onChange: (val: string | string[]) => void
}) {
  // Layout / visual elements
  if (field.type === "heading")    return <HeadingElement field={field} />
  if (field.type === "subheading") return <SubheadingElement field={field} />
  if (field.type === "paragraph")  return <ParagraphElement field={field} />
  if (field.type === "divider")    return <DividerElement field={field} />
  if (field.type === "image")      return <ImageElement field={field} />

  // Input fields
  if (field.type === "text") {
    return (
      <TextField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
    )
  }
  if (field.type === "dropdown") {
    return (
      <DropdownField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
    )
  }
  if (field.type === "multiselect") {
    return (
      <MultiSelectField field={field} value={value as string[]} onChange={(v) => onChange(v)} error={error} />
    )
  }
  if (field.type === "entry_exit") {
    return (
      <EntryExitField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
    )
  }
  return null
}
