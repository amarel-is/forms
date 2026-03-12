"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Loader2, CheckCircle2, LogIn, LogOut, BookmarkCheck, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextField } from "./fields/text-field"
import { LongAnswerField } from "./fields/long-answer-field"
import { DropdownField } from "./fields/dropdown-field"
import { RadioField } from "./fields/radio-field"
import { MultiSelectField } from "./fields/multiselect-field"
import { CheckboxField } from "./fields/checkbox-field"
import { NumberField } from "./fields/number-field"
import { DateField } from "./fields/date-field"
import { StarRatingField } from "./fields/star-rating-field"
import { EntryExitField } from "./fields/entry-exit-field"
import { LocationField } from "./fields/location-field"
import {
  HeadingElement,
  SubheadingElement,
  ParagraphElement,
  DividerElement,
  ImageElement,
  LinkElement,
  SectionElement,
} from "./fields/layout-elements"
import { SignatureField } from "./fields/signature-field"
import { RememberDialog, MEMORY_KEY, isSaveableField, type FormMemory } from "./remember-dialog"
import { submitResponse } from "@/lib/actions/responses"
import { isLayoutField, type FieldConfig, type Form, type FormDataset } from "@/lib/types"
import { validateTextValue } from "@/lib/field-validation"
import { isFieldVisibleWithSections } from "@/lib/conditions"

interface FormRendererProps {
  form: Form
}

type FormValues = Record<string, string | string[]>
type FormErrors = Record<string, string>

// ─── Read saved memory from localStorage (safe for SSR) ───────────────────────

function readMemory(formId: string): FormMemory | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(MEMORY_KEY(formId))
    return raw ? (JSON.parse(raw) as FormMemory) : null
  } catch {
    return null
  }
}

function hasActiveMemory(formId: string): boolean {
  const m = readMemory(formId)
  return !!m && m.savedFieldIds.length > 0
}

// ─── Resolve dataset-backed options ────────────────────────────────────────────

function resolveFieldOptions(
  field: FieldConfig,
  datasets: FormDataset[] | undefined
): { labels: string[]; valueMap: Map<string, string> } | null {
  if (!field.data_source || !datasets) return null
  const ds = datasets.find((d) => d.id === field.data_source!.dataset_id)
  if (!ds) return null

  const labels: string[] = []
  const valueMap = new Map<string, string>()

  for (const row of ds.rows) {
    const label = String(row[field.data_source.label_column] ?? "")
    const value = String(row[field.data_source.value_column] ?? "")
    if (label) {
      labels.push(label)
      valueMap.set(label, value)
    }
  }
  return { labels, valueMap }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FormRenderer({ form }: FormRendererProps) {
  // Only input fields participate in form state
  const inputFields = form.fields.filter((f) => !isLayoutField(f.type))
  const afterSubmit = form.settings?.after_submit ?? "thank_you"
  const redirectUrl = form.settings?.redirect_url ?? ""

  const [values, setValues] = useState<FormValues>(() => {
    // 1. Build initial values from field default_value
    const initial: FormValues = {}
    inputFields.forEach((f) => {
      if (f.default_value !== undefined) {
        if (f.type === "date" && f.default_value === "__now__") {
          const now = new Date()
          const offset = now.getTimezoneOffset() * 60000
          const local = new Date(now.getTime() - offset)
          if ((f.date_mode ?? "date") === "datetime") {
            initial[f.id] = local.toISOString().slice(0, 16)
          } else {
            initial[f.id] = local.toISOString().slice(0, 10)
          }
        } else if (f.type === "multiselect") {
          initial[f.id] = Array.isArray(f.default_value)
            ? (f.default_value as string[])
            : []
        } else if (f.type === "checkbox") {
          initial[f.id] = f.default_value === true ? "true" : ""
        } else {
          initial[f.id] = String(f.default_value)
        }
      } else {
        initial[f.id] = f.type === "multiselect" ? [] : ""
      }
    })

    // 2. Overlay saved memory — higher priority than default_value
    const memory = readMemory(form.id)
    if (memory) {
      memory.savedFieldIds.forEach((id) => {
        if (id in initial && memory.values[id] !== undefined) {
          initial[id] = memory.values[id]
        }
      })
    }

    return initial
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [rememberOpen, setRememberOpen] = useState(false)

  // Track whether memory is active so we can show the indicator reactively
  const [memoryActive, setMemoryActive] = useState(() => hasActiveMemory(form.id))

  // Reactive visibility — recomputed whenever any value changes (section-aware)
  const visibleFieldIds = useMemo(
    () =>
      new Set(
        form.fields
          .filter((f) => isFieldVisibleWithSections(f, form.fields, values))
          .map((f) => f.id)
      ),
    [form.fields, values]
  )

  const submitButtonLabel =
    form.settings?.submit_label?.trim() ||
    (form.form_type === "attendance" ? "שלח דיווח" : "שלח")

  // Only show the remember button if the form has saveable fields
  const hasSaveableFields = form.fields.some(isSaveableField)

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
    inputFields
      .filter((f) => visibleFieldIds.has(f.id))   // skip hidden fields
      .forEach((f) => {
      const val = values[f.id]

      // Required check
      if (f.required) {
        if (f.type === "multiselect") {
          if ((val as string[]).length === 0)
            newErrors[f.id] = "אנא בחר לפחות אפשרות אחת"
        } else if (f.type === "checkbox") {
          if (val !== "true")
            newErrors[f.id] = "יש לסמן תיבה זו כדי להמשיך"
        } else {
          if (!val || (val as string).trim() === "")
            newErrors[f.id] = "שדה זה הוא חובה"
        }
      }

      // Number range validation
      if (f.type === "number" && val && (val as string).trim() !== "") {
        const num = Number(val)
        if (Number.isNaN(num)) {
          newErrors[f.id] = "יש להזין מספר תקין"
        } else if (f.min !== undefined && num < f.min) {
          newErrors[f.id] = `הערך המינימלי הוא ${f.min}`
        } else if (f.max !== undefined && num > f.max) {
          newErrors[f.id] = `הערך המקסימלי הוא ${f.max}`
        }
      }

      // Pattern / format validation (text fields only, only if a value exists)
      if (f.type === "text" && val && (val as string).trim() !== "") {
        const validationError = validateTextValue(val as string, f.validation)
        if (validationError) {
          newErrors[f.id] = validationError
        }
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
      // Exclude hidden fields from the submission payload
      const submittableValues = Object.fromEntries(
        Object.entries(values).filter(([id]) => visibleFieldIds.has(id))
      )
      const result = await submitResponse(form.id, submittableValues)
      if (result.error) {
        toast.error(result.error)
      } else {
        if (result.warning) {
          toast.warning(result.warning)
        }
        if (afterSubmit === "redirect" && redirectUrl) {
          window.location.href = redirectUrl
        } else {
          setSubmitted(true)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
      }
    } catch {
      toast.error("אירעה שגיאה. אנא נסה שוב.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleRememberClose() {
    setRememberOpen(false)
    // Refresh the indicator after dialog closes
    setMemoryActive(hasActiveMemory(form.id))
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
    <>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6 mb-8">
          {form.fields
            .filter((f) => {
              if (f.type === "section") return visibleFieldIds.has(f.id)
              if (isLayoutField(f.type)) return true
              return visibleFieldIds.has(f.id)
            })
            .map((field) => (
              <div key={field.id} id={`field-${field.id}`}>
                <FieldRenderer
                  field={field}
                  value={isLayoutField(field.type) ? "" : values[field.id]}
                  error={errors[field.id]}
                  onChange={(val) => setValue(field.id, val)}
                  datasets={form.schema?.datasets as FormDataset[] | undefined}
                />
              </div>
            ))}
        </div>

        {/* Remember button — shown above submit when saveable fields exist */}
        {hasSaveableFields && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={() => setRememberOpen(true)}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors group"
            >
              {memoryActive ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-green-600 font-medium">תשובות נשמרות</span>
                  <span className="text-neutral-300">·</span>
                  <span className="group-hover:underline">ערוך</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5 shrink-0" />
                  <span className="group-hover:underline">זכור את התשובות שלי לפעמים הבאות</span>
                </>
              )}
            </button>
          </div>
        )}

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

      {/* Remember dialog — outside the form to avoid submit interference */}
      <RememberDialog
        open={rememberOpen}
        onClose={handleRememberClose}
        formId={form.id}
        fields={form.fields}
        currentValues={values}
      />
    </>
  )
}

// ─── Field renderer ───────────────────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  error,
  onChange,
  datasets,
}: {
  field: FieldConfig
  value: string | string[]
  error?: string
  onChange: (val: string | string[]) => void
  datasets?: FormDataset[]
}) {
  // Layout / visual elements
  if (field.type === "heading")    return <HeadingElement field={field} />
  if (field.type === "subheading") return <SubheadingElement field={field} />
  if (field.type === "paragraph")  return <ParagraphElement field={field} />
  if (field.type === "divider")    return <DividerElement field={field} />
  if (field.type === "image")      return <ImageElement field={field} />
  if (field.type === "link")       return <LinkElement field={field} />
  if (field.type === "section")    return <SectionElement field={field} />

  // Input fields
  if (field.type === "text") {
    return <TextField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "long_answer") {
    return <LongAnswerField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "number") {
    return <NumberField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "date") {
    return <DateField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "dropdown") {
    const resolved = resolveFieldOptions(field, datasets)
    return <DropdownField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} resolvedOptions={resolved?.labels} />
  }
  if (field.type === "radio") {
    const resolved = resolveFieldOptions(field, datasets)
    return <RadioField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} resolvedOptions={resolved?.labels} />
  }
  if (field.type === "multiselect") {
    const resolved = resolveFieldOptions(field, datasets)
    return <MultiSelectField field={field} value={value as string[]} onChange={(v) => onChange(v)} error={error} resolvedOptions={resolved?.labels} />
  }
  if (field.type === "checkbox") {
    return <CheckboxField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "star_rating") {
    return <StarRatingField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "entry_exit") {
    return <EntryExitField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "location") {
    return <LocationField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  if (field.type === "signature") {
    return <SignatureField field={field} value={value as string} onChange={(v) => onChange(v)} error={error} />
  }
  return null
}
