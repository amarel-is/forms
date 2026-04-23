"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, FileText, Sparkles, Loader2, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getTemplates, createFormFromTemplate, deleteTemplate, type TemplateListItem } from "@/lib/actions/templates"

interface NewFormDialogProps {
  isSuperadmin: boolean
  trigger?: React.ReactNode
}

export function NewFormDialog({ isSuperadmin, trigger }: NewFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [using, setUsing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [open])

  async function handleUseTemplate(templateId: string) {
    setUsing(templateId)
    const result = await createFormFromTemplate(templateId)
    setUsing(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.formId) {
      setOpen(false)
      router.push(`/forms/${result.formId}`)
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm("למחוק את התבנית לצמיתות?")) return
    setDeleting(templateId)
    const result = await deleteTemplate(templateId)
    setDeleting(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("התבנית נמחקה")
    setTemplates((prev) => prev.filter((t) => t.form.id !== templateId))
  }

  function handleStartBlank() {
    setOpen(false)
    router.push("/forms/new")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="rounded-xl gap-2 h-9 bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          טופס חדש
        </Button>
      )}

      <DialogContent dir="rtl" className="rounded-2xl max-w-3xl w-[95vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-orange-500" />
            מרכז התבניות
          </DialogTitle>
          <DialogDescription>
            התחל מאפס או בחר תבנית קיימת
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 space-y-4">
          {/* Start blank card */}
          <button
            type="button"
            onClick={handleStartBlank}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-neutral-300 hover:border-orange-400 hover:bg-orange-50 transition-colors text-start"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
              <Plus className="h-5 w-5 text-neutral-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-900">התחל מאפס</p>
              <p className="text-xs text-neutral-500">צור טופס חדש ללא תבנית</p>
            </div>
          </button>

          {/* Templates grid */}
          <div>
            <p className="text-xs font-medium text-neutral-600 mb-2 px-1">
              תבניות ארגוניות {templates.length > 0 && `(${templates.length})`}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-10 bg-neutral-50 rounded-xl border border-neutral-100">
                <FileText className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">אין תבניות זמינות כרגע</p>
                <p className="text-xs text-neutral-400 mt-1">
                  סמן טופס כתבנית מהכרטיס שלו כדי לשתף עם הארגון
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(({ form, creatorEmail }) => (
                  <div
                    key={form.id}
                    className="group relative bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md hover:border-orange-200 transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {form.name}
                        </p>
                        <p className="text-xs text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" />
                          {creatorEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(form.id)}
                        disabled={using === form.id}
                        className="flex-1 h-8 rounded-lg text-xs bg-orange-600 hover:bg-orange-500 text-white border-0"
                      >
                        {using === form.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "השתמש בתבנית"
                        )}
                      </Button>
                      {isSuperadmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(form.id)}
                          disabled={deleting === form.id}
                          className="h-8 rounded-lg text-destructive hover:bg-red-50 border-neutral-200 shrink-0"
                          title="מחק תבנית (סופר אדמין)"
                        >
                          {deleting === form.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
