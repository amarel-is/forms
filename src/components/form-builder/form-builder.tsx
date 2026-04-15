"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  ArrowRight,
  Globe,
  EyeOff,
  Save,
  Loader2,
  Settings2,
  ExternalLink,
  Users,
  Sparkles,
  BarChart2,
  User,
  CreditCard,
  Building2,
  ArrowLeftRight,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Plus,
  Trash2,
  ClipboardCheck,
  Database,
  Code,
  Webhook,
  Sparkles as SparklesIcon,
  Undo2,
  Redo2,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AmarelLogo } from "@/components/layout/amarel-nav"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AddFieldButton } from "./add-field-button"
import { FieldItem } from "./field-item"
import { FieldEditorPanel } from "./field-editor-panel"
import { FormPreview } from "./form-preview"
import { createForm, updateForm } from "@/lib/actions/forms"
import {
  buildAttendanceFields,
  isLayoutField,
  type ApprovalWorkflowStep,
  type ApprovalTargetSource,
  type FieldConfig,
  type FieldType,
  type Form,
  type FormDataset,
  type FormType,
} from "@/lib/types"
import { DatasetEditor } from "./dataset-editor"
import { AiChatPanel } from "./ai-chat-panel"
import { EmbedDialog } from "./embed-dialog"
import { WebhooksPanel } from "./webhooks-panel"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { useHistory } from "@/hooks/use-history"

interface FormBuilderProps {
  initialForm?: Form
}

type EditableApprovalStep = ApprovalWorkflowStep & { _id: string }

const DEFAULT_STEP = (): EditableApprovalStep => ({
  _id: nanoid(),
  approver_name: "",
  channel: "email",
  source_type: "fixed",
  target: "",
  source_field_id: "",
  target_by_value: {},
})

export function FormBuilder({ initialForm }: FormBuilderProps) {
  const router = useRouter()
  const [name, setName] = useState(initialForm?.name ?? "")
  const [description, setDescription] = useState(initialForm?.description ?? "")
  const { value: fields, set: setFields, undo, redo, canUndo, canRedo } = useHistory<FieldConfig[]>(initialForm?.fields ?? [])
  const [formType, setFormType] = useState<FormType>(initialForm?.form_type ?? "general")
  const [submitLabel, setSubmitLabel] = useState(
    initialForm?.settings?.submit_label ?? ""
  )
  const [afterSubmit, setAfterSubmit] = useState<"thank_you" | "redirect">(
    initialForm?.settings?.after_submit ?? "thank_you"
  )
  const [redirectUrl, setRedirectUrl] = useState(
    initialForm?.settings?.redirect_url ?? ""
  )
  const [titleAlign, setTitleAlign] = useState<"right" | "center" | "left">(
    initialForm?.settings?.title_align ?? "right"
  )
  const [approvalSteps, setApprovalSteps] = useState<EditableApprovalStep[]>(
    initialForm?.settings?.approval_workflow?.steps?.length
      ? initialForm.settings.approval_workflow.steps.map((s) => ({ ...s, _id: nanoid(), source_type: s.source_type ?? "fixed", target: s.target ?? "", source_field_id: s.source_field_id ?? "", target_by_value: s.target_by_value ?? {} }))
      : [DEFAULT_STEP()]
  )
  const [approvalVisMode, setApprovalVisMode] = useState<"all" | "selected">(
    initialForm?.settings?.approval_field_visibility?.mode ?? "all"
  )
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  // null = form settings panel; string = field editor
  const [rightPanel, setRightPanel] = useState<"settings" | "field">("settings")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(initialForm?.is_published ?? false)
  const [attendanceDialog, setAttendanceDialog] = useState(false)
  const [datasets, setDatasets] = useState<FormDataset[]>(
    (initialForm?.schema?.datasets as FormDataset[] | undefined) ?? []
  )
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null)
  const [hideBranding, setHideBranding] = useState(
    initialForm?.settings?.hide_branding ?? false
  )
  const [submissionLimitFieldId, setSubmissionLimitFieldId] = useState(
    initialForm?.settings?.submission_limit_field_id ?? ""
  )
  const [submissionLimitCount, setSubmissionLimitCount] = useState(
    initialForm?.settings?.submission_limit_count ?? 1
  )
  const [submissionLimitErrorMessage, setSubmissionLimitErrorMessage] = useState(
    initialForm?.settings?.submission_limit_error_message ?? ""
  )
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false)

  const isEditing = !!initialForm

  // Snapshot of last-saved state for dirty detection
  const savedSnapshotRef = useRef(
    JSON.stringify({
      name: initialForm?.name ?? "",
      description: initialForm?.description ?? "",
      fields: initialForm?.fields ?? [],
      formType: initialForm?.form_type ?? "general",
      submitLabel: initialForm?.settings?.submit_label ?? "",
      afterSubmit: initialForm?.settings?.after_submit ?? "thank_you",
      redirectUrl: initialForm?.settings?.redirect_url ?? "",
      titleAlign: initialForm?.settings?.title_align ?? "right",
      hideBranding: initialForm?.settings?.hide_branding ?? false,
      submissionLimitFieldId: initialForm?.settings?.submission_limit_field_id ?? "",
      submissionLimitCount: initialForm?.settings?.submission_limit_count ?? 1,
      submissionLimitErrorMessage: initialForm?.settings?.submission_limit_error_message ?? "",
    })
  )

  const isDirty = useMemo(() => {
    const current = JSON.stringify({
      name, description, fields, formType, submitLabel,
      afterSubmit, redirectUrl, titleAlign, hideBranding,
      submissionLimitFieldId, submissionLimitCount, submissionLimitErrorMessage,
    })
    return current !== savedSnapshotRef.current
  }, [name, description, fields, formType, submitLabel, afterSubmit, redirectUrl, titleAlign, hideBranding, submissionLimitFieldId, submissionLimitCount, submissionLimitErrorMessage])

  useUnsavedChanges(isDirty)

  // Keyboard shortcuts: Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y for redo
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (isInput) return

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const selectedField =
    rightPanel === "field" && selectedFieldId
      ? fields.find((f) => f.id === selectedFieldId) ?? null
      : null

  function selectField(id: string) {
    setSelectedFieldId(id)
    setRightPanel("field")
  }

  function openSettings() {
    setSelectedFieldId(null)
    setRightPanel("settings")
  }

  function addField(type: FieldType) {
    const layout = isLayoutField(type)
    const noPlaceholderTypes = new Set([
      "entry_exit", "dropdown", "multiselect", "radio", "checkbox", "star_rating", "date", "location",
    ])
    const newField: FieldConfig = {
      id: nanoid(),
      type,
      label: "",
      required: false,
      // Placeholder for text-like fields only
      ...(!layout && !noPlaceholderTypes.has(type) ? { placeholder: "" } : {}),
      // Options for select fields
      ...(type === "dropdown" || type === "multiselect" || type === "radio" ? { options: [] } : {}),
    }
    setFields((prev) => [...prev, newField])
    selectField(newField.id)
  }

  function updateField(updated: FieldConfig) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id))
    if (selectedFieldId === id) {
      setSelectedFieldId(null)
      setRightPanel("settings")
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function applyAttendanceTemplate() {
    setFormType("attendance")
    setName((prev) => prev || "דיווח נוכחות במשרד")
    setDescription((prev) => prev || "דיווח כניסה ויציאה מהמשרד")
    setSubmitLabel("שלח דיווח")
    setFields(buildAttendanceFields())
    setSelectedFieldId(null)
    setRightPanel("settings")
    setAttendanceDialog(false)
    toast.success("תבנית נוכחות הוגדרה!")
  }

  const inputFields = fields.filter((f) => !isLayoutField(f.type))

  const getFieldOptions = useCallback((fieldId: string): string[] => {
    const field = inputFields.find((item) => item.id === fieldId)
    if (!field) return []
    if (field.type === "entry_exit") return ["כניסה", "יציאה"]
    if (field.type === "checkbox") return ["true"]
    if (field.type === "radio") return field.options ?? []
    return field.options ?? []
  }, [inputFields])

  function updateApprovalStep(index: number, patch: Partial<EditableApprovalStep>) {
    setApprovalSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function resetStepSource(index: number, sourceType: ApprovalTargetSource) {
    updateApprovalStep(index, { source_type: sourceType, source_field_id: "", target: "", target_by_value: {} })
  }

  function updateStepTargetMap(index: number, key: string, value: string) {
    setApprovalSteps((prev) => prev.map((s, i) => {
      if (i !== index) return s
      return { ...s, target_by_value: { ...(s.target_by_value ?? {}), [key]: value } }
    }))
  }

  function addApprovalStep() {
    setApprovalSteps((prev) => [...prev, DEFAULT_STEP()])
  }

  function removeApprovalStep(index: number) {
    setApprovalSteps((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [DEFAULT_STEP()]
    })
  }

  function applyApprovalTemplate() {
    setFormType("approval")
    setName((prev) => prev || "בקשה לאישור")
    setDescription((prev) => prev || "")
    setSubmitLabel("שלח לאישור")
    setApprovalSteps([DEFAULT_STEP()])
    setSelectedFieldId(null)
    setRightPanel("settings")
    toast.success("תבנית סבב אישורים הוגדרה!")
  }

  const handleSave = useCallback(
    async (publish?: boolean) => {
      if (!name.trim()) {
        toast.error("אנא תן שם לטופס")
        return
      }

      if (formType === "approval") {
        const invalid = approvalSteps.some((step) => {
          if (!step.approver_name.trim()) return true
          const src = step.source_type ?? "fixed"
          if (src === "fixed") return !step.target?.trim()
          if (!step.source_field_id?.trim()) return true
          if (src === "from_option_map") {
            const opts = getFieldOptions(step.source_field_id!)
            if (opts.length === 0) return true
            return opts.some((opt) => !(step.target_by_value?.[opt] ?? "").trim())
          }
          return false
        })
        if (invalid) {
          toast.error("סבב אישורים: יש להשלים הגדרות מאשר לכל שלב")
          return
        }
      }

      if (publish === undefined) setSaving(true)
      else setPublishing(true)

      try {
        const dirField = fields.find((f) => f.attendance_role === "direction")
        const idField = fields.find((f) => f.attendance_role === "id_number")

        const payload = {
          name: name.trim(),
          description: description.trim() || undefined,
          fields,
          form_type: formType,
          settings: {
            submit_message:
              formType === "attendance" ? "הדיווח נקלט בהצלחה!" : "תודה על תגובתך!",
            submit_label: submitLabel.trim() || undefined,
            after_submit: afterSubmit,
            redirect_url: afterSubmit === "redirect" ? redirectUrl.trim() || undefined : undefined,
            title_align: titleAlign,
            hide_branding: hideBranding || undefined,
            ...(submissionLimitFieldId ? {
              submission_limit_field_id: submissionLimitFieldId,
              submission_limit_count: submissionLimitCount,
              ...(submissionLimitErrorMessage.trim() ? { submission_limit_error_message: submissionLimitErrorMessage.trim() } : {}),
            } : {}),
            ...(dirField && { attendance_direction_field: dirField.id }),
            ...(idField && { attendance_id_field: idField.id }),
            ...(formType === "approval" ? {
              approval_workflow: {
                enabled: true,
                steps: approvalSteps.map((s) => ({
                  approver_name: s.approver_name.trim(),
                  channel: s.channel,
                  source_type: s.source_type ?? "fixed",
                  ...(s.source_type === "fixed" ? { target: (s.target ?? "").trim() } : {}),
                  ...(s.source_type !== "fixed" ? { source_field_id: s.source_field_id?.trim() ?? "" } : {}),
                  ...(s.source_type === "from_option_map" ? { target_by_value: Object.fromEntries(Object.entries(s.target_by_value ?? {}).map(([k, v]) => [k, v.trim()])) } : {}),
                })),
              },
              approval_field_visibility: {
                mode: approvalVisMode,
                ...(approvalVisMode === "selected" ? {
                  visible_field_ids: fields.filter((f) => !isLayoutField(f.type) && f.show_to_approver !== false).map((f) => f.id),
                } : {}),
              },
            } : {}),
          },
          schema: { ...(datasets.length > 0 ? { datasets } : {}) },
          ...(publish !== undefined ? { is_published: publish } : {}),
        }

        let result: Awaited<ReturnType<typeof createForm>>
        if (isEditing) {
          result = await updateForm(initialForm.id, payload)
        } else {
          result = await createForm(payload)
        }

        if (result.error) {
          toast.error(result.error)
          return
        }

        // Reset dirty state after successful save
        savedSnapshotRef.current = JSON.stringify({
          name, description, fields, formType, submitLabel,
          afterSubmit, redirectUrl, titleAlign, hideBranding,
          submissionLimitFieldId, submissionLimitCount, submissionLimitErrorMessage,
        })

        if (publish !== undefined) {
          setIsPublished(publish)
          toast.success(publish ? "הטופס פורסם!" : "הטופס הוסר מפרסום")
        } else {
          toast.success(isEditing ? "השינויים נשמרו" : "הטופס נוצר!")
          if (!isEditing && result.form) {
            router.push(`/forms/${result.form.id}`)
          }
        }
      } finally {
        setSaving(false)
        setPublishing(false)
      }
    },
    [name, description, fields, formType, submitLabel, afterSubmit, redirectUrl, titleAlign, hideBranding, submissionLimitFieldId, submissionLimitCount, submissionLimitErrorMessage, approvalSteps, approvalVisMode, getFieldOptions, datasets, isEditing, initialForm, router]
  )

  return (
    <>
      <div className="flex flex-col h-screen bg-neutral-50">
        {/* Header — Amarel dark nav */}
        <header className="shrink-0 bg-[#2D4458] border-b border-[rgba(148,163,184,0.15)] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 rounded-xl shrink-0 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Link href="/dashboard">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <AmarelLogo size="sm" />

            <div className="w-px h-5 bg-white/20 shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="טופס ללא שם"
                className="border-0 shadow-none bg-transparent px-0 text-sm font-semibold text-white h-auto focus-visible:ring-0 placeholder:text-white/40 w-full max-w-xs"
              />
              {formType === "attendance" && (
                <Badge className="text-xs rounded-lg shrink-0 bg-white/15 text-white border-white/20 hover:bg-white/20">
                  <Users className="h-3 w-3 me-1" />
                  נוכחות
                </Badge>
              )}
              {formType === "approval" && (
                <Badge className="text-xs rounded-lg shrink-0 bg-emerald-500/20 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/30">
                  <ClipboardCheck className="h-3 w-3 me-1" />
                  סבב אישורים
                </Badge>
              )}
              {isDirty && (
                <span className="flex items-center gap-1 text-[10px] text-amber-300/80 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  לא נשמר
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing && formType === "attendance" && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="rounded-xl gap-1.5 h-8 text-xs text-white/80 hover:text-white hover:bg-white/10"
              >
                <Link href={`/forms/${initialForm.id}/attendance`}>
                  <Users className="h-3.5 w-3.5" />
                  נוכחות
                </Link>
              </Button>
            )}

            {isEditing && formType === "approval" && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="rounded-xl gap-1.5 h-8 text-xs text-white/80 hover:text-white hover:bg-white/10"
              >
                <Link href={`/forms/${initialForm.id}/approvals`}>
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  אישורים
                </Link>
              </Button>
            )}

            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="rounded-xl gap-1.5 h-8 text-xs text-white/80 hover:text-white hover:bg-white/10"
              >
                <Link href={`/forms/${initialForm.id}/results`}>
                  <BarChart2 className="h-3.5 w-3.5" />
                  תוצאות
                </Link>
              </Button>
            )}

            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEmbedDialogOpen(true)}
                className="rounded-xl gap-1.5 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex"
              >
                <Code className="h-3.5 w-3.5" />
                הטמעה
              </Button>
            )}

            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="rounded-xl gap-1.5 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex"
              >
                <Link href={`/f/${initialForm.id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" />
                  תצוגה
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAiChatOpen(!aiChatOpen)}
              className={`rounded-xl gap-1.5 h-8 text-xs border ${
                aiChatOpen
                  ? "bg-violet-500/20 text-violet-200 border-violet-400/30"
                  : "text-white/80 hover:text-white hover:bg-white/10 border-white/20"
              }`}
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              AI
            </Button>

            <div className="w-px h-5 bg-white/15 hidden sm:block" />

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 hidden sm:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={!canUndo}
                title="ביטול (Ctrl+Z)"
                className="h-8 w-8 rounded-xl text-white/60 hover:text-white hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={!canRedo}
                title="שחזור (Ctrl+Shift+Z)"
                className="h-8 w-8 rounded-xl text-white/60 hover:text-white hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving}
              className="rounded-xl gap-1.5 h-8 text-xs text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              שמור
            </Button>

            <Button
              size="sm"
              onClick={() => handleSave(!isPublished)}
              disabled={publishing}
              className={`rounded-xl gap-1.5 h-8 text-xs ${
                isPublished
                  ? "bg-white/15 text-white hover:bg-white/20 border border-white/20"
                  : "bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-sm"
              }`}
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPublished ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              {isPublished ? "הסר פרסום" : "פרסם"}
            </Button>
          </div>
        </header>

        {/*
         * Body — 3 columns (RTL: right → center → left):
         *   1. Field list panel  (right side, w-56)
         *   2. Live preview      (center, flex-1)
         *   3. Editor / settings (left side, w-72, slides in)
         *
         * In RTL flex-row the first DOM child appears on the RIGHT.
         * We place them in visual right→center→left order in the DOM.
         *)
         */}
        <div className="flex flex-1 overflow-hidden" style={{ direction: "ltr" }}>
          {/* ── Col 3: Editor panel — LEFT (ltr-end, 30%) ── */}
          <div className="flex-[3] min-w-[280px] max-w-[380px] bg-white border-e border-neutral-200 flex flex-col overflow-hidden order-last">
            {/* Header */}
            <div
              className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between"
              style={{ direction: "rtl" }}
            >
              {selectedField ? (
                <>
                  <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                    עריכת שדה
                  </span>
                  <button
                    type="button"
                    onClick={openSettings}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    ✕ סגור
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    הגדרות טופס
                  </span>
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ direction: "rtl" }}>
              {selectedField ? (
                <FieldEditorPanel field={selectedField} onChange={updateField} allFields={fields} datasets={datasets} />
              ) : (
                <div className="space-y-5">
                  {/* Title alignment */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      יישור כותרת
                    </Label>
                    <div className="flex gap-1">
                      {(["right", "center", "left"] as const).map((align) => {
                        const Icon = align === "right" ? AlignRight : align === "center" ? AlignCenter : AlignLeft
                        return (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setTitleAlign(align)}
                            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border text-xs transition-colors ${
                              titleAlign === align
                                ? "bg-neutral-800 border-neutral-800 text-white"
                                : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      תיאור הטופס
                    </Label>
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                    />
                  </div>

                  <Separator />

                  {/* Submit label */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      טקסט כפתור השליחה
                    </Label>
                    <Input
                      value={submitLabel}
                      onChange={(e) => setSubmitLabel(e.target.value)}
                      placeholder={formType === "attendance" ? "שלח דיווח" : "שלח"}
                      className="h-9 rounded-xl text-sm"
                    />
                    <p className="text-xs text-neutral-400">
                      ברירת מחדל: &ldquo;{formType === "attendance" ? "שלח דיווח" : "שלח"}&rdquo;
                    </p>
                  </div>

                  <Separator />

                  {/* Approval workflow panel (only for approval type) */}
                  {formType === "approval" && (
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        שלבי אישור
                      </Label>
                      <div className="space-y-3 rounded-xl border border-neutral-200 p-3 bg-neutral-50/50">
                        {approvalSteps.map((step, index) => (
                          <div key={step._id} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-neutral-600">שלב {index + 1}</p>
                              <button type="button" onClick={() => removeApprovalStep(index)} className="text-neutral-400 hover:text-red-500" aria-label={`הסר שלב ${index + 1}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <Input value={step.approver_name} onChange={(e) => updateApprovalStep(index, { approver_name: e.target.value })} placeholder="שם מאשר" className="h-8 rounded-lg text-xs" />
                            <Select value={step.channel} onValueChange={(v: "email" | "whatsapp") => updateApprovalStep(index, { channel: v })}>
                              <SelectTrigger className="w-full h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={step.source_type ?? "fixed"} onValueChange={(v: ApprovalTargetSource) => resetStepSource(index, v)}>
                              <SelectTrigger className="w-full h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">יעד קבוע</SelectItem>
                                <SelectItem value="from_field">יעד משדה בטופס</SelectItem>
                                <SelectItem value="from_option_map">יעד ממיפוי לפי בחירה</SelectItem>
                              </SelectContent>
                            </Select>

                            {(step.source_type ?? "fixed") === "fixed" && (
                              <Textarea value={step.target ?? ""} onChange={(e) => updateApprovalStep(index, { target: e.target.value })}
                                placeholder={step.channel === "email" ? "כתובת אימייל" : "מספר WhatsApp"}
                                className="min-h-14 rounded-lg text-xs" />
                            )}

                            {(step.source_type ?? "fixed") !== "fixed" && (
                              <Select value={step.source_field_id ?? ""} onValueChange={(v) => updateApprovalStep(index, { source_field_id: v })}>
                                <SelectTrigger className="w-full h-8 rounded-lg text-xs"><SelectValue placeholder="בחר שדה מקור" /></SelectTrigger>
                                <SelectContent>
                                  {inputFields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label || f.id}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}

                            {(step.source_type ?? "fixed") === "from_option_map" && step.source_field_id && (
                              <div className="space-y-2 rounded-md border border-neutral-200 p-2 bg-neutral-50">
                                {getFieldOptions(step.source_field_id).map((opt) => (
                                  <div key={`${step._id}-${opt}`} className="space-y-1">
                                    <p className="text-[11px] text-neutral-500">ערך: <span className="font-medium text-neutral-700">{opt}</span></p>
                                    <Input value={step.target_by_value?.[opt] ?? ""} onChange={(e) => updateStepTargetMap(index, opt, e.target.value)}
                                      placeholder={step.channel === "email" ? "אימייל ליעד זה" : "WhatsApp ליעד זה"} className="h-8 rounded-lg text-xs" />
                                  </div>
                                ))}
                                {getFieldOptions(step.source_field_id).length === 0 && (
                                  <p className="text-xs text-amber-600">לשדה שנבחר אין אפשרויות למיפוי.</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addApprovalStep} className="w-full h-8 rounded-lg text-xs gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          הוסף שלב אישור
                        </Button>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                          שדות גלויים למאשר
                        </Label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setApprovalVisMode("all")}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${approvalVisMode === "all" ? "border-neutral-900 bg-neutral-50 text-neutral-900" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}>
                            הכל
                          </button>
                          <button type="button" onClick={() => setApprovalVisMode("selected")}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${approvalVisMode === "selected" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}>
                            רק מסומנים
                          </button>
                        </div>
                        {approvalVisMode === "selected" && (
                          <div className="space-y-1.5 mt-2 rounded-lg border border-neutral-200 p-2 bg-neutral-50">
                            {inputFields.map((f) => (
                              <label key={f.id} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                                <Checkbox
                                  checked={f.show_to_approver !== false}
                                  onCheckedChange={(checked) => updateField({ ...f, show_to_approver: Boolean(checked) })}
                                />
                                {f.label || f.id}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* After submit action */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      לאחר שליחה
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAfterSubmit("thank_you")}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                          afterSubmit === "thank_you"
                            ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                        }`}
                      >
                        עמוד תודה
                      </button>
                      <button
                        type="button"
                        onClick={() => setAfterSubmit("redirect")}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                          afterSubmit === "redirect"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                        }`}
                      >
                        הפנייה ל-URL
                      </button>
                    </div>
                    {afterSubmit === "redirect" && (
                      <Input
                        value={redirectUrl}
                        onChange={(e) => setRedirectUrl(e.target.value)}
                        placeholder="https://example.com/thank-you"
                        className="h-9 rounded-xl text-xs mt-1"
                        dir="ltr"
                      />
                    )}
                  </div>

                  <Separator />

                  {/* Submission limit by unique field */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      הגבלת הגשות לפי מזהה
                    </Label>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      מנע הגשות כפולות לפי ערך שדה ייחודי (למשל תעודת זהות, מספר טלפון).
                    </p>
                    <Select
                      value={submissionLimitFieldId || "__none__"}
                      onValueChange={(v) => {
                        setSubmissionLimitFieldId(v === "__none__" ? "" : v)
                        if (v === "__none__") setSubmissionLimitCount(1)
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-xl text-xs">
                        <SelectValue placeholder="ללא הגבלה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">ללא הגבלה</SelectItem>
                        {fields
                          .filter((f) => !isLayoutField(f.type))
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.label || `שדה (${f.type})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {submissionLimitFieldId && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-neutral-600 shrink-0">מקסימום הגשות למזהה</Label>
                          <Input
                            type="number"
                            min={1}
                            value={submissionLimitCount}
                            onChange={(e) => setSubmissionLimitCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="h-8 w-20 rounded-lg text-xs text-center"
                          />
                        </div>
                        <Input
                          value={submissionLimitErrorMessage}
                          onChange={(e) => setSubmissionLimitErrorMessage(e.target.value)}
                          placeholder={`הודעת שגיאה מותאמת (אופציונלי)`}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Hide branding */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={hideBranding}
                        onCheckedChange={(checked) => setHideBranding(Boolean(checked))}
                      />
                      <span className="text-xs text-neutral-700">הסתר ברנדינג (״מופעל על ידי אמרל טפסים״)</span>
                    </label>
                  </div>

                  <Separator />

                  {/* Datasets (mini databases) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      מאגרי מידע
                    </Label>
                    {datasets.length > 0 ? (
                      <div className="space-y-1.5">
                        {datasets.map((ds) => (
                          <div
                            key={ds.id}
                            className="flex items-center gap-2 bg-neutral-50 rounded-lg px-3 py-2 group"
                          >
                            <button
                              type="button"
                              onClick={() => setEditingDatasetId(ds.id)}
                              className="flex-1 text-start text-sm text-neutral-700 hover:text-neutral-900 truncate"
                            >
                              {ds.name}
                              <span className="text-[10px] text-neutral-400 ms-1.5">
                                ({ds.columns.length} עמודות · {ds.rows.length} שורות)
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDatasets((prev) => prev.filter((d) => d.id !== ds.id))
                                setFields((prev) =>
                                  prev.map((f) =>
                                    f.data_source?.dataset_id === ds.id
                                      ? { ...f, data_source: undefined }
                                      : f
                                  )
                                )
                              }}
                              className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">אין מאגרי מידע</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const id = nanoid()
                        const newDs: FormDataset = {
                          id,
                          name: `מאגר ${datasets.length + 1}`,
                          columns: [],
                          rows: [],
                        }
                        setDatasets((prev) => [...prev, newDs])
                        setEditingDatasetId(id)
                      }}
                      className="w-full h-8 rounded-xl gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      הוסף מאגר מידע
                    </Button>
                  </div>

                  {isEditing && initialForm && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide flex items-center gap-1.5">
                          <Webhook className="h-3.5 w-3.5" />
                          Webhooks
                        </Label>
                        <WebhooksPanel formId={initialForm.id} />
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Quick templates */}
                  {(!isEditing || formType === "general") && (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAttendanceDialog(true)}
                        className="w-full h-8 rounded-xl gap-1.5 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        תבנית מהירה: נוכחות
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={applyApprovalTemplate}
                        className="w-full h-8 rounded-xl gap-1.5 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        תבנית מהירה: סבב אישורים
                      </Button>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-neutral-50 rounded-xl p-3 text-center">
                      <div className="text-xl font-bold text-neutral-800">
                        {fields.filter((f) => !isLayoutField(f.type)).length}
                      </div>
                      <div className="text-xs text-neutral-500">שאלות</div>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-3 text-center">
                      <div className="text-xl font-bold text-violet-700">
                        {fields.filter((f) => isLayoutField(f.type)).length}
                      </div>
                      <div className="text-xs text-violet-500">עיצוב</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Col 2: Live preview — CENTER (40%) — restore RTL inside ── */}
          <div className="flex-[4] min-w-0 overflow-hidden border-e border-neutral-200" style={{ direction: "rtl" }}>
            <FormPreview
              name={name}
              description={description}
              titleAlign={titleAlign}
              fields={fields}
              submitLabel={
                submitLabel.trim() || (formType === "attendance" ? "שלח דיווח" : "שלח")
              }
              selectedFieldId={selectedField?.id ?? null}
              onSelectField={selectField}
            />
          </div>

          {/* ── Col 1: Field list — RIGHT (30%) ── */}
          <div className="flex-[3] min-w-[220px] max-w-[340px] bg-white border-e border-neutral-200 flex flex-col overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-neutral-100" style={{ direction: "rtl" }}>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">שדות</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ direction: "rtl" }}>
              {fields.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-neutral-400">לחץ + להוספת שדה</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {fields.map((field) => (
                      <FieldItem
                        key={field.id}
                        field={field}
                        isSelected={selectedField?.id === field.id}
                        onSelect={() => selectField(field.id)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="p-2 border-t border-neutral-100" style={{ direction: "rtl" }}>
              <AddFieldButton onAdd={addField} />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance template dialog */}
      <Dialog open={attendanceDialog} onOpenChange={setAttendanceDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              תבנית דיווח נוכחות
            </DialogTitle>
            <DialogDescription>
              תבנית מוכנה לדיווח כניסה ויציאה מהמשרד. תכלול את השדות:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2">
            {[
              { icon: <User className="h-4 w-4 text-neutral-500" />, label: "שם מלא", desc: "טקסט" },
              { icon: <CreditCard className="h-4 w-4 text-neutral-500" />, label: "תעודת זהות", desc: "טקסט" },
              { icon: <Building2 className="h-4 w-4 text-neutral-500" />, label: "חטיבה", desc: "רשימה נפתחת" },
              { icon: <ArrowLeftRight className="h-4 w-4 text-blue-500" />, label: "כניסה / יציאה", desc: "לחצן בחירה" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 bg-neutral-50 rounded-xl p-3">
                <span className="shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-medium text-neutral-800">{f.label}</p>
                  <p className="text-xs text-neutral-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-500">
            התאריך ושעת הדיווח נקלטים אוטומטית עם כל שליחה.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDialog(false)} className="rounded-xl">
              ביטול
            </Button>
            <Button onClick={applyAttendanceTemplate} className="rounded-xl gap-2">
              <Sparkles className="h-4 w-4" />
              הפעל תבנית
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dataset editor overlay */}
      {/* AI Chat Panel */}
      <AiChatPanel
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        fields={fields}
        onFieldsUpdate={setFields}
      />

      {isEditing && initialForm && (
        <EmbedDialog
          open={embedDialogOpen}
          onOpenChange={setEmbedDialogOpen}
          formId={initialForm.id}
        />
      )}

      {editingDatasetId && (() => {
        const ds = datasets.find((d) => d.id === editingDatasetId)
        if (!ds) return null
        return (
          <DatasetEditor
            dataset={ds}
            onChange={(updated) =>
              setDatasets((prev) =>
                prev.map((d) => (d.id === updated.id ? updated : d))
              )
            }
            onBack={() => setEditingDatasetId(null)}
            onDelete={() => {
              setDatasets((prev) => prev.filter((d) => d.id !== editingDatasetId))
              setFields((prev) =>
                prev.map((f) =>
                  f.data_source?.dataset_id === editingDatasetId
                    ? { ...f, data_source: undefined }
                    : f
                )
              )
              setEditingDatasetId(null)
            }}
          />
        )
      })()}
    </>
  )
}
