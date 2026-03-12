"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import {
  Pencil,
  Trash2,
  BarChart2,
  Eye,
  Copy,
  Globe,
  EyeOff,
  Users,
  ClipboardCheck,
  Inbox,
  Share2,
  QrCode,
  FolderOpen,
  FolderInput,
  Plus,
  Check,
  X,
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
import { ResponsesTable } from "@/components/results/responses-table"
import { ShareFormDialog } from "@/components/results/share-form-dialog"
import { deleteForm, updateForm } from "@/lib/actions/forms"
import { getResponses } from "@/lib/actions/responses"
import type { Form, FormResponse } from "@/lib/types"

interface FormCardProps {
  form: Form
  responseCount: number
  allFolders?: string[]
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

export function FormCard({ form, responseCount, allFolders = [] }: FormCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [submissionsOpen, setSubmissionsOpen] = useState(false)
  const [submissions, setSubmissions] = useState<FormResponse[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [movingFolder, setMovingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

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

  async function handleOpenSubmissions() {
    setSubmissionsOpen(true)
    if (submissions.length === 0) {
      setLoadingSubmissions(true)
      const result = await getResponses(form.id)
      if (result.error) {
        toast.error("שגיאה בטעינת ההגשות")
      } else {
        setSubmissions(result.responses)
      }
      setLoadingSubmissions(false)
    }
  }

  const formattedDate = new Date(form.created_at).toLocaleDateString("he-IL", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <>
      <div className="group relative bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md hover:border-neutral-300 transition-all duration-200 flex flex-col gap-4">
        {/* Header — above click overlay so menu opens instead of navigating */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 truncate text-sm">
              {form.name}
            </h3>
            {form.description && stripHtml(form.description) && (
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                {stripHtml(form.description)}
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
                <Pencil className="h-3.5 w-3.5" />
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
              {form.form_type === "approval" && (
                <DropdownMenuItem asChild>
                  <Link href={`/forms/${form.id}/approvals`} className="flex items-center gap-2">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    לוח אישורים
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/f/${form.id}`} target="_blank" className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5" />
                  תצוגה מקדימה
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-2">
                <Copy className="h-3.5 w-3.5" />
                העתק קישור
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShareOpen(true)} className="flex items-center gap-2">
                <QrCode className="h-3.5 w-3.5" />
                QR וקישור קצר
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
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={() => setFolderOpen(true)}
              >
                <FolderInput className="h-3.5 w-3.5" />
                העבר לתיקיה
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
            {form.form_type === "approval" && (
              <Badge className="text-xs rounded-lg bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                <ClipboardCheck className="h-2.5 w-2.5 me-1" />
                סבב אישורים
              </Badge>
            )}
            <Badge
              variant={form.is_published ? "default" : "secondary"}
              className="text-xs rounded-lg"
            >
              {form.is_published ? "מפורסם" : "טיוטה"}
            </Badge>
            {form.folder && (
              <Badge variant="outline" className="text-xs rounded-lg text-neutral-500 border-neutral-200">
                <FolderOpen className="h-2.5 w-2.5 me-1" />
                {form.folder}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick action buttons — above click overlay */}
        <div className="relative z-10 flex items-center gap-1.5 border-t border-neutral-100 pt-3 -mx-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="h-7 flex-1 text-xs text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            שיתוף / QR
          </Button>
          <div className="w-px h-4 bg-neutral-200 shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenSubmissions}
            className="h-7 flex-1 text-xs text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg gap-1.5"
          >
            <Inbox className="h-3.5 w-3.5" />
            הגשות
            {responseCount > 0 && (
              <span className="bg-orange-100 text-orange-700 rounded-full px-1.5 py-0 text-[10px] font-semibold leading-4">
                {responseCount}
              </span>
            )}
          </Button>
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

      {/* Share / QR dialog */}
      <ShareFormDialog
        formId={form.id}
        formName={form.name}
        noTrigger
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      {/* Submissions quick-view dialog */}
      <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
        <DialogContent className="rounded-2xl max-w-6xl w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-orange-600" />
              הגשות — {form.name}
            </DialogTitle>
            <DialogDescription>
              {loadingSubmissions
                ? "טוען הגשות…"
                : submissions.length === 0
                ? "אין הגשות עדיין לטופס זה."
                : `${submissions.length} ${submissions.length === 1 ? "הגשה" : "הגשות"}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            {loadingSubmissions ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <ResponsesTable
                fields={form.fields.filter(
                  (f) => !["heading", "subheading", "paragraph", "divider", "image", "link"].includes(f.type)
                )}
                responses={submissions}
                compact={false}
              />
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-neutral-100 pt-3 mt-0">
            <Button variant="outline" onClick={() => setSubmissionsOpen(false)} className="rounded-xl">
              סגור
            </Button>
            <Button asChild className="rounded-xl bg-orange-600 hover:bg-orange-500 text-white border-0">
              <Link href={`/forms/${form.id}/results`} onClick={() => setSubmissionsOpen(false)}>
                <BarChart2 className="h-4 w-4 me-1.5" />
                צפה בדוח המלא
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to folder dialog */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="rounded-2xl max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderInput className="h-4.5 w-4.5 text-neutral-600" />
              העבר לתיקיה
            </DialogTitle>
            <DialogDescription>
              בחר תיקיה עבור &quot;{form.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            <button
              type="button"
              disabled={movingFolder}
              onClick={async () => {
                setMovingFolder(true)
                await updateForm(form.id, { folder: null } as Parameters<typeof updateForm>[1])
                setFolderOpen(false)
                setMovingFolder(false)
                toast.success("הטופס הועבר")
              }}
              className={`w-full text-start px-3 py-2.5 rounded-xl text-sm transition-colors ${
                !form.folder
                  ? "bg-neutral-800 text-white"
                  : "hover:bg-neutral-50 text-neutral-600"
              }`}
            >
              ללא תיקיה
            </button>
            {allFolders.map((f) => (
              <button
                key={f}
                type="button"
                disabled={movingFolder}
                onClick={async () => {
                  setMovingFolder(true)
                  await updateForm(form.id, { folder: f } as Parameters<typeof updateForm>[1])
                  setFolderOpen(false)
                  setMovingFolder(false)
                  toast.success(`הטופס הועבר ל"${f}"`)
                }}
                className={`w-full text-start px-3 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors ${
                  form.folder === f
                    ? "bg-neutral-800 text-white"
                    : "hover:bg-neutral-50 text-neutral-600"
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                {f}
              </button>
            ))}

            <div className="border-t border-neutral-100 pt-1.5 mt-1.5">
              {creatingFolder ? (
                <div className="flex items-center gap-1.5 px-1">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && newFolderName.trim()) {
                        setMovingFolder(true)
                        await updateForm(form.id, { folder: newFolderName.trim() } as Parameters<typeof updateForm>[1])
                        setFolderOpen(false)
                        setMovingFolder(false)
                        setCreatingFolder(false)
                        setNewFolderName("")
                        toast.success(`הטופס הועבר ל"${newFolderName.trim()}"`)
                      }
                      if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") }
                    }}
                    placeholder="שם תיקיה חדשה..."
                    autoFocus
                    className="flex-1 h-8 rounded-lg border border-neutral-200 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    disabled={movingFolder || !newFolderName.trim()}
                    onClick={async () => {
                      if (!newFolderName.trim()) return
                      setMovingFolder(true)
                      await updateForm(form.id, { folder: newFolderName.trim() } as Parameters<typeof updateForm>[1])
                      setFolderOpen(false)
                      setMovingFolder(false)
                      setCreatingFolder(false)
                      setNewFolderName("")
                      toast.success(`הטופס הועבר ל"${newFolderName.trim()}"`)
                    }}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => { setCreatingFolder(false); setNewFolderName("") }} className="text-neutral-400 hover:text-neutral-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingFolder(true)}
                  className="w-full text-start px-3 py-2.5 rounded-xl text-sm flex items-center gap-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  תיקיה חדשה...
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
