"use client"

import {
  Plus,
  Type,
  AlignLeft,
  ChevronDown,
  ListChecks,
  CheckSquare,
  Hash,
  CalendarDays,
  Star,
  ArrowLeftRight,
  Heading1,
  Heading2,
  Minus,
  ImageIcon,
  Link2,
  PenLine,
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
    label: "תשובה קצרה",
    icon: <Type className="h-4 w-4" />,
    description: "שורה אחת של טקסט",
  },
  {
    type: "long_answer",
    label: "תשובה ארוכה",
    icon: <AlignLeft className="h-4 w-4" />,
    description: "תיבת טקסט מרובת שורות",
  },
  {
    type: "number",
    label: "מספר",
    icon: <Hash className="h-4 w-4" />,
    description: "קלט מספרי עם min/max",
  },
  {
    type: "date",
    label: "תאריך",
    icon: <CalendarDays className="h-4 w-4" />,
    description: "בחירת תאריך",
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
    type: "checkbox",
    label: "צ'קבוקס",
    icon: <CheckSquare className="h-4 w-4" />,
    description: "אישור הצהרה / בחירה בוליאנית",
  },
  {
    type: "star_rating",
    label: "דירוג כוכבים",
    icon: <Star className="h-4 w-4" />,
    description: "דירוג 1–5 כוכבים",
  },
  {
    type: "signature",
    label: "חתימה",
    icon: <PenLine className="h-4 w-4" />,
    description: "חתימה בכתב יד",
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
    type: "link",
    label: "לינק",
    icon: <Link2 className="h-4 w-4" />,
    description: "קישור לחיץ",
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
      <DropdownMenuContent align="center" className="w-56 [direction:rtl]">
        <DropdownMenuLabel className="text-xs text-neutral-400 font-medium text-right">
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
        <DropdownMenuLabel className="text-xs text-neutral-400 font-medium text-right">
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
