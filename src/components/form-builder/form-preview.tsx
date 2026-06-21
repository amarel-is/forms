"use client"

import {
  Type,
  ChevronDown,
  ListChecks,
  LogIn,
  LogOut,
  Heading1,
  Heading2,
  AlignLeft,
  Minus,
  ImageIcon,
  Link2,
  ExternalLink,
  PenLine,
  Circle,
  MapPin,
  Layers,
  Search,
  Sparkles,
} from "lucide-react"
import { isLayoutField, type FieldConfig } from "@/lib/types"
import { FormStyle, FORM_ROOT_ID } from "@/components/form-renderer/form-style"

interface FormPreviewProps {
  name: string
  description: string
  titleAlign?: "right" | "center" | "left"
  fields: FieldConfig[]
  submitLabel: string
  customCss?: string
  selectedFieldId: string | null
  onSelectField: (id: string) => void
}

export function FormPreview({
  name,
  description,
  titleAlign = "right",
  fields,
  submitLabel,
  customCss,
  selectedFieldId,
  onSelectField,
}: FormPreviewProps) {
  return (
    <div id={FORM_ROOT_ID} className="h-full overflow-y-auto bg-neutral-100" dir="rtl">
      <FormStyle css={customCss} />
      {/* Phone-frame wrapper */}
      <div className="min-h-full py-8 px-6 flex justify-center">
        <div className="w-full max-w-md">
          {/* Form card */}
          <div data-form-card className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            {/* Form header */}
            <div data-form-header className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <h1
                data-form-title
                className="text-xl font-bold text-neutral-900"
                style={{ textAlign: titleAlign }}
              >
                {name || "טופס ללא שם"}
              </h1>
              {description && (
                <div
                  data-form-description
                  className="text-sm text-neutral-500 mt-1.5 leading-relaxed rich-text"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>

            {/* Fields */}
            <div data-form-body className="px-6 py-5 space-y-5">
              {fields.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-neutral-400">
                    הוסף שדות כדי לראות תצוגה מקדימה
                  </p>
                </div>
              ) : (
                fields.map((field) => (
                  <div
                    key={field.id}
                    data-field
                    data-field-type={field.type}
                    onClick={() => onSelectField(field.id)}
                    className={`group relative rounded-xl transition-all duration-100 cursor-pointer ${
                      selectedFieldId === field.id
                        ? "ring-2 ring-blue-500 ring-offset-2"
                        : "hover:ring-1 hover:ring-neutral-300 hover:ring-offset-1"
                    }`}
                  >
                    {/* Selection indicator */}
                    {selectedFieldId === field.id && (
                      <div className="absolute -top-2.5 end-2 bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-10">
                        נבחר
                      </div>
                    )}
                    <PreviewField field={field} />
                  </div>
                ))
              )}

              {/* Submit button preview */}
              <div className="pt-2">
                <div data-form-submit className="w-full h-12 rounded-xl bg-neutral-900 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {submitLabel || "שלח"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview label */}
          <p className="text-center text-xs text-neutral-400 mt-4">
            תצוגה מקדימה — לחץ על שדה כדי לערוך אותו
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Individual field preview ─────────────────────────────────────────────────

function PreviewField({ field }: { field: FieldConfig }) {
  const layout = isLayoutField(field.type)

  // Layout elements
  if (field.type === "heading") {
    return (
      <div className="px-2 py-1">
        <h2 className="text-2xl font-bold text-neutral-900">
          {field.label || <span className="text-neutral-300">כותרת ראשית</span>}
        </h2>
      </div>
    )
  }

  if (field.type === "subheading") {
    return (
      <div className="px-2 py-1">
        <h3 className="text-lg font-semibold text-neutral-800">
          {field.label || <span className="text-neutral-300">כותרת משנה</span>}
        </h3>
      </div>
    )
  }

  if (field.type === "paragraph") {
    const text = field.content ?? field.label
    const styleMap: Record<string, string> = {
      default: "",
      info: "rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800",
      success: "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800",
      warning: "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800",
      danger: "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800",
    }
    const cls = styleMap[field.paragraph_style ?? "default"] ?? ""
    return (
      <div className={cls || "px-2 py-1"}>
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${cls ? "" : "text-neutral-600"}`}>
          {text || <span className="text-neutral-300">פסקת טקסט</span>}
        </p>
      </div>
    )
  }

  if (field.type === "divider") {
    return (
      <div className="flex items-center gap-3 py-2 px-2">
        <div className="flex-1 h-px bg-neutral-200" />
        {field.label && (
          <span className="text-xs text-neutral-400 shrink-0">{field.label}</span>
        )}
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
    )
  }

  if (field.type === "link") {
    const href = field.content ?? ""
    return (
      <div className="flex justify-center px-2 py-1">
        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-blue-200 bg-blue-50">
          <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="text-sm font-medium text-blue-600">
            {field.label || href || "לינק"}
          </span>
        </div>
      </div>
    )
  }

  if (field.type === "image") {
    const src = field.content ?? ""
    return (
      <div className="rounded-xl overflow-hidden bg-neutral-50 border border-neutral-100">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={field.label || ""}
            className="w-full max-h-48 object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = "none"
            }}
          />
        ) : (
          <div className="h-28 flex flex-col items-center justify-center gap-2 text-neutral-300">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">הוסף כתובת URL של תמונה</span>
          </div>
        )}
      </div>
    )
  }

  if (field.type === "section") {
    return (
      <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-4 py-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-violet-500 shrink-0" />
        <span className="text-sm font-semibold text-violet-700">
          {field.label || <span className="text-violet-300">סקשן ללא שם</span>}
        </span>
        {field.conditions && field.conditions.rules.length > 0 && (
          <span className="text-[10px] bg-blue-100 text-blue-600 rounded-md px-1.5 py-0.5 font-medium ms-auto">
            מותנה
          </span>
        )}
      </div>
    )
  }

  if (field.type === "dataset_lookup") {
    return (
      <div className="rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50/50 px-4 py-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-cyan-600 shrink-0" />
        <span className="text-sm font-semibold text-cyan-700">
          {field.label || <span className="text-cyan-300">תצוגת מאגר</span>}
        </span>
        <span className="text-[10px] bg-cyan-100 text-cyan-600 rounded-md px-1.5 py-0.5 font-medium ms-auto">
          VLOOKUP
        </span>
      </div>
    )
  }

  if (field.type === "ai_computed") {
    return (
      <div className="rounded-xl border-2 border-dashed border-violet-300 bg-gradient-to-br from-violet-50/50 to-purple-50/50 px-4 py-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
        <span className="text-sm font-semibold text-violet-700">
          {field.label || <span className="text-violet-300">חישוב AI</span>}
        </span>
        <span className="text-[10px] bg-violet-100 text-violet-600 rounded-md px-1.5 py-0.5 font-medium ms-auto">
          AI
        </span>
      </div>
    )
  }

  // Input fields
  return (
    <div className="space-y-1.5 p-1">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <FieldTypeIcon type={field.type} />
        <span className="text-sm font-medium text-neutral-800 flex-1">
          {field.label || (
            <span className="text-neutral-300 italic">תווית השדה</span>
          )}
        </span>
        {field.required && !layout && (
          <span className="text-red-400 text-xs font-bold">*</span>
        )}
      </div>

      {/* Field mock */}
      <FieldMock field={field} />
    </div>
  )
}

function FieldTypeIcon({ type }: { type: FieldConfig["type"] }) {
  const cls = "h-3.5 w-3.5 text-neutral-400 shrink-0"
  if (type === "text") return <Type className={cls} />
  if (type === "dropdown") return <ChevronDown className={cls} />
  if (type === "radio") return <Circle className={cls} />
  if (type === "multiselect") return <ListChecks className={cls} />
  if (type === "entry_exit") return <LogIn className={cls} />
  if (type === "location") return <MapPin className={cls} />
  if (type === "signature") return <PenLine className={cls} />
  if (type === "heading") return <Heading1 className={cls} />
  if (type === "subheading") return <Heading2 className={cls} />
  if (type === "paragraph") return <AlignLeft className={cls} />
  if (type === "divider") return <Minus className={cls} />
  if (type === "image") return <ImageIcon className={cls} />
  if (type === "link") return <Link2 className={cls} />
  if (type === "dataset_lookup") return <Search className={cls} />
  if (type === "ai_computed") return <Sparkles className={cls} />
  return null
}

function FieldMock({ field }: { field: FieldConfig }) {
  if (field.type === "text") {
    const vtype = field.validation?.type
    const vLabel = vtype && vtype !== "none"
      ? {
          numbers_only: "מספרים בלבד",
          text_only: "טקסט בלבד",
          phone_il: "טלפון",
          id_il: "ת.ז.",
          custom_regex: "Regex",
        }[vtype]
      : null
    return (
      <div className="space-y-1">
        <div className="h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center justify-between">
          <span className="text-sm text-neutral-300">
            {field.placeholder || "תשובתך…"}
          </span>
          {vLabel && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-md px-1.5 py-0.5 font-medium shrink-0">
              {vLabel}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (field.type === "dropdown") {
    return (
      <div className="h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center justify-between">
        <span className="text-sm text-neutral-300">בחר אפשרות…</span>
        <ChevronDown className="h-4 w-4 text-neutral-300" />
      </div>
    )
  }

  if (field.type === "multiselect") {
    const opts = (field.options ?? []).slice(0, 3)
    if (opts.length === 0) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <span className="text-xs text-neutral-300">הוסף אפשרויות…</span>
        </div>
      )
    }
    return (
      <div className="space-y-1.5">
        {opts.map((opt) => (
          <div
            key={opt}
            className="h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center gap-2.5"
          >
            <div className="w-4 h-4 rounded border border-neutral-300 shrink-0" />
            <span className="text-sm text-neutral-600">{opt}</span>
          </div>
        ))}
        {(field.options ?? []).length > 3 && (
          <p className="text-xs text-neutral-400 ps-1">
            +{(field.options ?? []).length - 3} אפשרויות נוספות
          </p>
        )}
      </div>
    )
  }

  if (field.type === "entry_exit") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border-2 border-green-200 bg-green-50 py-4 flex flex-col items-center gap-1.5">
          <LogIn className="h-5 w-5 text-green-500" strokeWidth={2} />
          <span className="text-sm font-bold text-green-700">כניסה</span>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 py-4 flex flex-col items-center gap-1.5">
          <LogOut className="h-5 w-5 text-red-400" strokeWidth={2} />
          <span className="text-sm font-bold text-red-600">יציאה</span>
        </div>
      </div>
    )
  }

  if (field.type === "radio") {
    const opts = (field.options ?? []).slice(0, 3)
    if (opts.length === 0) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <span className="text-xs text-neutral-300">הוסף אפשרויות…</span>
        </div>
      )
    }
    return (
      <div className="space-y-1.5">
        {opts.map((opt) => (
          <div
            key={opt}
            className="h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center gap-2.5"
          >
            <div className="w-4 h-4 rounded-full border-2 border-neutral-300 shrink-0" />
            <span className="text-sm text-neutral-600">{opt}</span>
          </div>
        ))}
        {(field.options ?? []).length > 3 && (
          <p className="text-xs text-neutral-400 ps-1">
            +{(field.options ?? []).length - 3} אפשרויות נוספות
          </p>
        )}
      </div>
    )
  }

  if (field.type === "location") {
    return (
      <div className="flex gap-2 items-center">
        <div className="flex-1 h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center">
          <span className="text-sm text-neutral-300">קואורדינטות…</span>
        </div>
        <div className="h-10 px-3 rounded-lg bg-blue-100 border border-blue-200 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs text-blue-600 font-medium">מיקום</span>
        </div>
      </div>
    )
  }

  if (field.type === "signature") {
    return (
      <div className="rounded-xl border-2 border-neutral-200 bg-white overflow-hidden">
        <div className="h-28 flex flex-col items-center justify-center gap-2 text-neutral-300">
          <PenLine className="h-7 w-7" />
          <span className="text-xs">חתום כאן</span>
        </div>
        <div className="border-t border-neutral-100 mx-4 mb-5" />
      </div>
    )
  }

  return null
}
