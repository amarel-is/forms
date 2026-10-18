"use client"

import { Download, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AnswerValue, FieldConfig, FormResponse, ResponseApproval, ApprovalStatus } from "@/lib/types"
import { formatAnswerText, repeaterItems, scalarText } from "@/lib/answer-format"

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending: "ממתין",
  in_progress: "בתהליך",
  approved: "אושר",
  rejected: "נדחה",
  expired: "פג תוקף",
}

interface ExportButtonProps {
  fields: FieldConfig[]
  responses: FormResponse[]
  formName: string
  approvalsByResponseId?: Record<string, ResponseApproval>
  showApprovalColumns?: boolean
  /** Custom data keys added via the external submissions API that have no matching form field. */
  extraKeys?: string[]
}

function stringifyValue(val: AnswerValue | undefined, field?: FieldConfig): string {
  if (val === null || val === undefined) return ""
  if (field?.type === "repeater") return formatAnswerText(field, val, " | ")
  if (Array.isArray(val)) return val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")
  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function ExportButton({
  fields,
  responses,
  formName,
  approvalsByResponseId = {},
  showApprovalColumns = false,
  extraKeys = [],
}: ExportButtonProps) {
  const repeaterFields = fields.filter((f) => f.type === "repeater")

  /**
   * @param explodeFieldId repeater whose items each become their own row
   *   (the response's other columns repeat on every row). Omit for one row per response.
   */
  function handleExport(explodeFieldId?: string) {
    const explode = repeaterFields.find((f) => f.id === explodeFieldId)
    const explodeSubs = explode?.sub_fields ?? []
    const headers = ["זמן שליחה"]
    if (showApprovalColumns) {
      headers.push("סטטוס אישור", "שלב")
    }
    fields.forEach((f) => {
      if (explode && f.id === explode.id) {
        headers.push(`${f.label || "קבוצה"} — מס׳`)
        explodeSubs.forEach((sf) => headers.push(`${f.label || "קבוצה"} — ${sf.label || "שדה"}`))
      } else {
        headers.push(f.label || "ללא שם")
      }
    })
    extraKeys.forEach((key) => headers.push(key))

    const rows = responses.flatMap((response) => {
      const row: string[] = []

      row.push(
        new Date(response.submitted_at).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      )

      if (showApprovalColumns) {
        const appr = approvalsByResponseId[response.id]
        row.push(appr ? APPROVAL_LABEL[appr.status] : "")
        row.push(
          appr
            ? `${appr.current_step_index + 1}/${Math.max(appr.steps.length, 1)}`
            : ""
        )
      }

      const explodeAt = row.length + (explode ? fields.findIndex((f) => f.id === explode.id) : 0)
      fields.forEach((f) => {
        if (explode && f.id === explode.id) return
        row.push(stringifyValue(response.data[f.id], f))
      })

      extraKeys.forEach((key) => {
        row.push(stringifyValue(response.data[key]))
      })

      if (!explode) return [row]
      // Splice the item columns in where the repeater column sits
      const items = repeaterItems(response.data[explode.id])
      const itemCells = items.length > 0
        ? items.map((item, i) => [String(i + 1), ...explodeSubs.map((sf) => scalarText(item[sf.id]))])
        : [["", ...explodeSubs.map(() => "")]]
      return itemCells.map((cells) => [...row.slice(0, explodeAt), ...cells, ...row.slice(explodeAt)])
    })

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n")

    // UTF-8 BOM for Hebrew support in Excel
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const date = new Date().toISOString().slice(0, 10)
    const safeName = formName.replace(/[^\w\u0590-\u05FF\s-]/g, "").trim() || "export"
    const filename = `${safeName}_${date}.csv`

    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (responses.length === 0) return null

  if (repeaterFields.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport()}
        className="rounded-xl gap-1.5 h-8 text-xs"
      >
        <Download className="h-3.5 w-3.5" />
        ייצוא CSV
      </Button>
    )
  }

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-xs">
          <Download className="h-3.5 w-3.5" />
          ייצוא CSV
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => handleExport()} className="text-xs">
          שורה לכל תגובה
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] text-neutral-400 font-normal">
          שורה לכל פריט בקבוצה
        </DropdownMenuLabel>
        {repeaterFields.map((f) => (
          <DropdownMenuItem key={f.id} onClick={() => handleExport(f.id)} className="text-xs">
            שורה לכל פריט — {f.label || "קבוצה חוזרת"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
