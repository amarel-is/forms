"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Type, ChevronDown, ListChecks, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { FieldConfig } from "@/lib/types"

const TYPE_ICON = {
  text: <Type className="h-3.5 w-3.5" />,
  dropdown: <ChevronDown className="h-3.5 w-3.5" />,
  multiselect: <ListChecks className="h-3.5 w-3.5" />,
}

const TYPE_LABEL = {
  text: "טקסט",
  dropdown: "רשימה נפתחת",
  multiselect: "בחירה מרובה",
}

interface FieldItemProps {
  field: FieldConfig
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

export function FieldItem({ field, isSelected, onSelect, onDelete }: FieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
        isSelected
          ? "border-neutral-900 bg-neutral-50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
      }`}
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
      <span className={`shrink-0 ${isSelected ? "text-neutral-700" : "text-neutral-400"}`}>
        {TYPE_ICON[field.type]}
      </span>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">
          {field.label || "שדה ללא שם"}
        </p>
        <p className="text-xs text-neutral-400">{TYPE_LABEL[field.type]}</p>
      </div>

      {/* Required badge */}
      {field.required && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0 rounded-md shrink-0">
          חובה
        </Badge>
      )}

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
