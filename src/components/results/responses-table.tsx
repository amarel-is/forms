"use client"

import { useState, useTransition } from "react"
import { Trash2, Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteResponse } from "@/lib/actions/responses"
import type { FieldConfig, FormResponse, ResponseApproval, ApprovalStatus } from "@/lib/types"

interface ResponsesTableProps {
  fields: FieldConfig[]
  responses: FormResponse[]
  approvalsByResponseId?: Record<string, ResponseApproval>
  showApprovalColumns?: boolean
  /** When false, cells are wider and text wraps instead of truncating (e.g. in dialog) */
  compact?: boolean
  formId?: string
}

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending: "ממתין",
  in_progress: "בתהליך",
  approved: "אושר",
  rejected: "נדחה",
  expired: "פג תוקף",
}

const APPROVAL_CLASS: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-neutral-100 text-neutral-600 border-neutral-200",
}

function getResponseText(response: FormResponse): string {
  return Object.values(response.data)
    .map((v) => (Array.isArray(v) ? v.join(" ") : v ?? ""))
    .join(" ")
    .toLowerCase()
}

export function ResponsesTable({ fields, responses, approvalsByResponseId = {}, showApprovalColumns = false, compact = true, formId }: ResponsesTableProps) {
  const router = useRouter()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? responses.filter((r) => getResponseText(r).includes(query.trim().toLowerCase()))
    : responses

  function handleDelete() {
    if (!pendingDeleteId || !formId) return
    startTransition(async () => {
      await deleteResponse(pendingDeleteId, formId)
      setPendingDeleteId(null)
      router.refresh()
    })
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

  if (responses.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400 text-sm">
        עדיין אין תגובות
      </div>
    )
  }

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
        <Input
          dir="rtl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש בתגובות..."
          className="pr-9 pl-8 h-9 text-sm rounded-xl border-neutral-200 bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50">
              <TableHead className="text-xs font-semibold text-neutral-500 w-32 text-right">
                זמן שליחה
              </TableHead>
              {showApprovalColumns && (
                <>
                  <TableHead className="text-xs font-semibold text-neutral-500 min-w-[110px] text-right">סטטוס אישור</TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-500 min-w-[90px] text-right">שלב</TableHead>
                </>
              )}
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
              {formId && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={1 + fields.length + (showApprovalColumns ? 2 : 0) + (formId ? 1 : 0)}
                  className="text-center py-10 text-neutral-400 text-sm"
                >
                  לא נמצאו תגובות
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((response) => (
                <TableRow key={response.id} className="hover:bg-neutral-50 group">
                  <TableCell className="text-xs text-neutral-500 whitespace-nowrap text-right">
                    {new Date(response.submitted_at).toLocaleDateString("he-IL", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  {showApprovalColumns && (() => {
                    const appr = approvalsByResponseId[response.id]
                    return (
                      <>
                        <TableCell className="text-right">
                          {appr ? (
                            <Badge className={`rounded-md border text-xs ${APPROVAL_CLASS[appr.status]}`}>
                              {APPROVAL_LABEL[appr.status]}
                            </Badge>
                          ) : <span className="text-neutral-300">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs text-neutral-600">
                          {appr ? `${appr.current_step_index + 1}/${Math.max(appr.steps.length, 1)}` : "—"}
                        </TableCell>
                      </>
                    )
                  })()}
                  {fields.map((f) => (
                    <TableCell
                      key={f.id}
                      className={`text-right ${compact ? "max-w-[200px] truncate" : "min-w-[160px] max-w-[320px] break-words whitespace-normal"}`}
                    >
                      {formatValue(response.data[f.id])}
                    </TableCell>
                  ))}
                  {formId && (
                    <TableCell className="text-center p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-opacity"
                        onClick={() => setPendingDeleteId(response.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count when filtering */}
      {query.trim() && (
        <p className="text-xs text-neutral-400 mt-2 text-right">
          {filtered.length} מתוך {responses.length} תגובות
        </p>
      )}

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תגובה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את התגובה לצמיתות? לא ניתן לשחזר פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={isPending}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
