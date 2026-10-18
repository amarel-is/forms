"use client"

import { Rows3 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { AnswerValue, FieldConfig } from "@/lib/types"
import { repeaterCountText, repeaterItems } from "@/lib/answer-format"
import { RepeaterTable } from "./repeater-table"

/** Table cell for a repeater answer: a count badge that opens the full item table. */
export function RepeaterValueCell({ field, value }: { field: FieldConfig; value: AnswerValue | undefined }) {
  const count = repeaterItems(value).length
  if (count === 0) return <span className="text-neutral-300">—</span>

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
        >
          <Rows3 className="h-3.5 w-3.5" />
          {repeaterCountText(count)}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{field.label || "קבוצה חוזרת"}</DialogTitle>
        </DialogHeader>
        <RepeaterTable field={field} value={value} />
      </DialogContent>
    </Dialog>
  )
}
