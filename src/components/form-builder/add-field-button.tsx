"use client"

import { Plus, Type, ChevronDown, ListChecks, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FieldType } from "@/lib/types"

const FIELD_TYPES: {
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
      <DropdownMenuContent align="center" className="w-52">
        {FIELD_TYPES.map(({ type, label, icon, description }, i) => (
          <div key={type}>
            {i === 3 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => onAdd(type)}
              className="flex items-start gap-3 py-2.5"
            >
              <span className="mt-0.5 text-neutral-500">{icon}</span>
              <div>
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-neutral-400">{description}</div>
              </div>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
