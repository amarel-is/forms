"use client"

import {
  Plus,
  Type,
  ChevronDown,
  ListChecks,
  ArrowLeftRight,
  Heading1,
  Heading2,
  AlignLeft,
  Minus,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FieldType } from "@/lib/types"

const INPUT_FIELD_TYPES: {
  type: FieldType
  label: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    type: "text",
    label: "טקסט",
    icon: <Type className="h-4 w-4" />,
    description: "תשובה קצרה או ארוכה",
  },
  {
    type: "dropdown",
    label: "רשימה נפתחת",
    icon: <ChevronDown className="h-4 w-4" />,
    description: "בחירת אפשרות אחת",
  },
  {
    type: "multiselect",
    label: "בחירה מרובה",
    icon: <ListChecks className="h-4 w-4" />,
    description: "בחירת מספר אפשרויות",
  },
  {
    type: "entry_exit",
    label: "כניסה / יציאה",
    icon: <ArrowLeftRight className="h-4 w-4" />,
    description: "לחצן דיווח נוכחות",
  },
]

const LAYOUT_FIELD_TYPES: {
  type: FieldType
  label: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    type: "heading",
    label: "כותרת ראשית",
    icon: <Heading1 className="h-4 w-4" />,
    description: "כותרת H1 גדולה",
  },
  {
    type: "subheading",
    label: "כותרת משנה",
    icon: <Heading2 className="h-4 w-4" />,
    description: "כותרת H2 בינונית",
  },
  {
    type: "paragraph",
    label: "פסקת טקסט",
    icon: <AlignLeft className="h-4 w-4" />,
    description: "בלוק תוכן חופשי",
  },
  {
    type: "divider",
    label: "קו הפרדה",
    icon: <Minus className="h-4 w-4" />,
    description: "קו אופקי להפרדת חלקים",
  },
  {
    type: "image",
    label: "תמונה",
    icon: <ImageIcon className="h-4 w-4" />,
    description: "תמונה לפי כתובת URL",
  },
]

interface AddFieldButtonProps {
  onAdd: (type: FieldType) => void
}

export function AddFieldButton({ onAdd }: AddFieldButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-10 rounded-xl border-dashed border-neutral-300 text-neutral-500 hover:text-neutral-700 hover:border-neutral-400 gap-2"
        >
          <Plus className="h-4 w-4" />
          הוסף שדה
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuLabel className="text-xs text-neutral-400 font-medium">
          שאלות
        </DropdownMenuLabel>

        {INPUT_FIELD_TYPES.map(({ type, label, icon, description }) => (
          <DropdownMenuItem
            key={type}
            onClick={() => onAdd(type)}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <span className="mt-0.5 text-neutral-500 shrink-0">{icon}</span>
            <div>
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-neutral-400">{description}</div>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-neutral-400 font-medium">
          עיצוב ופריסה
        </DropdownMenuLabel>

        {LAYOUT_FIELD_TYPES.map(({ type, label, icon, description }) => (
          <DropdownMenuItem
            key={type}
            onClick={() => onAdd(type)}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <span className="mt-0.5 text-violet-500 shrink-0">{icon}</span>
            <div>
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-neutral-400">{description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
