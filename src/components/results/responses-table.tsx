"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { FieldConfig, FormResponse } from "@/lib/types"

interface ResponsesTableProps {
  fields: FieldConfig[]
  responses: FormResponse[]
  /** When false, cells are wider and text wraps instead of truncating (e.g. in dialog) */
  compact?: boolean
}

export function ResponsesTable({ fields, responses, compact = true }: ResponsesTableProps) {
  if (responses.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400 text-sm">
        עדיין אין תגובות
      </div>
    )
  }

  function formatValue(val: string | string[] | undefined): React.ReactNode {
    if (!val) return <span className="text-neutral-300">—</span>
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-neutral-300">—</span>
      return (
        <div className="flex flex-wrap gap-1">
          {val.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs rounded-md">
              {v}
            </Badge>
          ))}
        </div>
      )
    }
    return <span className="text-sm text-neutral-700">{val}</span>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-50">
            <TableHead className="text-xs font-semibold text-neutral-500 w-32 text-right">
              זמן שליחה
            </TableHead>
            {fields.map((f) => (
              <TableHead
                key={f.id}
                className={`text-xs font-semibold text-neutral-500 text-right ${
                  compact ? "min-w-[140px]" : "min-w-[160px]"
                }`}
              >
                {f.label || "ללא שם"}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((response) => (
            <TableRow key={response.id} className="hover:bg-neutral-50">
              <TableCell className="text-xs text-neutral-500 whitespace-nowrap text-right">
                {new Date(response.submitted_at).toLocaleDateString("he-IL", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              {fields.map((f) => (
                <TableCell
                  key={f.id}
                  className={`text-right ${compact ? "max-w-[200px] truncate" : "min-w-[160px] max-w-[320px] break-words whitespace-normal"}`}
                >
                  {formatValue(response.data[f.id])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
