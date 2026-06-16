"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FieldConfig, FormResponse, ResponseApproval, ApprovalStatus } from "@/lib/types"

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

function stringifyValue(val: unknown): string {
  if (val === null || val === undefined) return ""
  if (Array.isArray(val)) return val.map((v) => String(v)).join(", ")
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
  function handleExport() {
    const headers = ["זמן שליחה"]
    if (showApprovalColumns) {
      headers.push("סטטוס אישור", "שלב")
    }
    fields.forEach((f) => headers.push(f.label || "ללא שם"))
    extraKeys.forEach((key) => headers.push(key))

    const rows = responses.map((response) => {
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

      fields.forEach((f) => {
        row.push(stringifyValue(response.data[f.id]))
      })

      extraKeys.forEach((key) => {
        row.push(stringifyValue(response.data[key]))
      })

      return row
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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="rounded-xl gap-1.5 h-8 text-xs"
    >
      <Download className="h-3.5 w-3.5" />
      ייצוא CSV
    </Button>
  )
}
