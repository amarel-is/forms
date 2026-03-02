"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  Type,
  ChevronDown,
  ListChecks,
  Trash2,
  ArrowLeftRight,
  Heading1,
  Heading2,
  AlignLeft,
  Minus,
  ImageIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { isLayoutField, type FieldConfig } from "@/lib/types"

const TYPE_ICON: Record<FieldConfig["type"], React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  dropdown: <ChevronDown className="h-3.5 w-3.5" />,
  multiselect: <ListChecks className="h-3.5 w-3.5" />,
  entry_exit: <ArrowLeftRight className="h-3.5 w-3.5" />,
  heading: <Heading1 className="h-3.5 w-3.5" />,
  subheading: <Heading2 className="h-3.5 w-3.5" />,
  paragraph: <AlignLeft className="h-3.5 w-3.5" />,
  divider: <Minus className="h-3.5 w-3.5" />,
  image: <ImageIcon className="h-3.5 w-3.5" />,
}

const TYPE_LABEL: Record<FieldConfig["type"], string> = {
  text: "טקסט",
  dropdown: "רשימה נפתחת",
  multiselect: "בחירה מרובה",
  entry_exit: "כניסה / יציאה",
  heading: "כותרת ראשית",
  subheading: "כותרת משנה",
  paragraph: "פסקת טקסט",
  divider: "קו הפרדה",
  image: "תמונה",
}

interface FieldItemProps {
  field: FieldConfig
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

export function FieldItem({ field, isSelected, onSelect, onDelete }: FieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const layout = isLayoutField(field.type)

  // Preview text: for layout fields show the actual content
  const previewText = (): string => {
    if (field.type === "divider") return "──────────"
    if (field.type === "image") return field.content ?? field.placeholder ?? "תמונה"
    return field.label || "שדה ללא שם"
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`
        group flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer
        transition-all duration-150
        ${
          isSelected
            ? layout
              ? "border-violet-400 bg-violet-50/60 shadow-sm"
              : "border-neutral-900 bg-neutral-50 shadow-sm"
            : layout
            ? "border-violet-100 bg-white hover:border-violet-300"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
        }
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Icon */}
      <span
        className={`shrink-0 ${
          isSelected
            ? layout ? "text-violet-600" : "text-neutral-700"
            : layout ? "text-violet-400" : "text-neutral-400"
        }`}
      >
        {TYPE_ICON[field.type]}
      </span>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">
          {previewText()}
        </p>
        <p className={`text-xs truncate ${layout ? "text-violet-400" : "text-neutral-400"}`}>
          {TYPE_LABEL[field.type]}
        </p>
      </div>

      {/* Required badge (input fields only) */}
      {!layout && field.required && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0 rounded-md shrink-0">
          חובה
        </Badge>
      )}

      {/* Layout badge */}
      {layout && (
        <Badge
          className="text-xs px-1.5 py-0 rounded-md shrink-0 bg-violet-100 text-violet-600 border-violet-200 hover:bg-violet-100"
          variant="outline"
        >
          עיצוב
        </Badge>
      )}

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
