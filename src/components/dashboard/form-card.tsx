"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  BarChart2,
  ExternalLink,
  Copy,
  Globe,
  EyeOff,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteForm, updateForm } from "@/lib/actions/forms"
import type { Form } from "@/lib/types"

interface FormCardProps {
  form: Form
  responseCount: number
}

export function FormCard({ form, responseCount }: FormCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteForm(form.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("הטופס נמחק")
    }
    setDeleting(false)
    setDeleteOpen(false)
  }

  async function handleTogglePublish() {
    setToggling(true)
    const result = await updateForm(form.id, { is_published: !form.is_published })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(form.is_published ? "הטופס הוסר מפרסום" : "הטופס פורסם! שתף את הקישור.")
    }
    setToggling(false)
  }

  function handleCopyLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/f/${form.id}`
        : `/f/${form.id}`
    navigator.clipboard.writeText(url)
    toast.success("הקישור הועתק!")
  }

  const formattedDate = new Date(form.created_at).toLocaleDateString("he-IL", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <>
      <div className="group relative bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md hover:border-neutral-300 transition-all duration-200 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 truncate text-sm">
              {form.name}
            </h3>
            {form.description && (
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                {form.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/forms/${form.id}`} className="flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5" />
                  ערוך
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/forms/${form.id}/results`} className="flex items-center gap-2">
                  <BarChart2 className="h-3.5 w-3.5" />
                  תוצאות
                </Link>
              </DropdownMenuItem>
              {form.form_type === "attendance" && (
                <DropdownMenuItem asChild>
                  <Link href={`/forms/${form.id}/attendance`} className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    לוח נוכחות
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/f/${form.id}`} target="_blank" className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  תצוגה מקדימה
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-2">
                <Copy className="h-3.5 w-3.5" />
                העתק קישור
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleTogglePublish}
                disabled={toggling}
                className="flex items-center gap-2"
              >
                {form.is_published ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    הסר פרסום
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    פרסם
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive flex items-center gap-2"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                מחק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-neutral-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-neutral-900">{form.fields.length}</div>
            <div className="text-xs text-neutral-500">
              {form.fields.length === 1 ? "שדה" : "שדות"}
            </div>
          </div>
          <div className="flex-1 bg-neutral-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-neutral-900">{responseCount}</div>
            <div className="text-xs text-neutral-500">
              {responseCount === 1 ? "תגובה" : "תגובות"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-neutral-400">{formattedDate}</span>
          <div className="flex items-center gap-1.5">
            {form.form_type === "attendance" && (
              <Badge className="text-xs rounded-lg bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                <Users className="h-2.5 w-2.5 me-1" />
                נוכחות
              </Badge>
            )}
            <Badge
              variant={form.is_published ? "default" : "secondary"}
              className="text-xs rounded-lg"
            >
              {form.is_published ? "מפורסם" : "טיוטה"}
            </Badge>
          </div>
        </div>

        {/* Click overlay */}
        <Link
          href={`/forms/${form.id}`}
          className="absolute inset-0 rounded-2xl"
          aria-label={`ערוך ${form.name}`}
        />
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>מחיקת טופס?</DialogTitle>
            <DialogDescription>
              פעולה זו תמחק לצמיתות את &quot;{form.name}&quot; ואת כל התגובות שלו. לא ניתן לבטל פעולה זו.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "מוחק…" : "מחק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
