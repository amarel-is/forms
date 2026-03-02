"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextField } from "./fields/text-field"
import { DropdownField } from "./fields/dropdown-field"
import { MultiSelectField } from "./fields/multiselect-field"
import { submitResponse } from "@/lib/actions/responses"
import type { FieldConfig, Form } from "@/lib/types"

interface FormRendererProps {
  form: Form
}

type FormValues = Record<string, string | string[]>
type FormErrors = Record<string, string>

export function FormRenderer({ form }: FormRendererProps) {
  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {}
    form.fields.forEach((f) => {
      initial[f.id] = f.type === "multiselect" ? [] : ""
    })
    return initial
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
    form.fields.forEach((f) => {
      if (!f.required) return
      const val = values[f.id]
      if (f.type === "multiselect") {
        if ((val as string[]).length === 0) {
          newErrors[f.id] = "אנא בחר לפחות אפשרות אחת"
        }
      } else {
        if (!val || (val as string).trim() === "") {
          newErrors[f.id] = "שדה זה הוא חובה"
        }
      }
    })
    setErrors(newErrors)
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
      }
    } catch {
      toast.error("אירעה שגיאה. אנא נסה שוב.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-8 w-8 text-neutral-700" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          {form.settings?.submit_message ?? "תודה!"}
        </h2>
        <p className="text-sm text-neutral-500">תגובתך נקלטה בהצלחה.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {form.fields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors[field.id]}
          onChange={(val) => setValue(field.id, val)}
        />
      ))}

      <Button type="submit" className="w-full h-11 rounded-xl font-medium" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "שלח"}
      </Button>
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
  if (field.type === "text") {
    return (
      <TextField
        field={field}
        value={value as string}
        onChange={(v) => onChange(v)}
        error={error}
      />
    )
  }
  if (field.type === "dropdown") {
    return (
      <DropdownField
        field={field}
        value={value as string}
        onChange={(v) => onChange(v)}
        error={error}
      />
    )
  }
  if (field.type === "multiselect") {
    return (
      <MultiSelectField
        field={field}
        value={value as string[]}
        onChange={(v) => onChange(v)}
        error={error}
      />
    )
  }
  return null
}
