"use client"

import { useState, useCallback } from "react"
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
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
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
  type FieldConfig,
  type FieldType,
  type Form,
  type FormType,
} from "@/lib/types"

interface FormBuilderProps {
  initialForm?: Form
}

export function FormBuilder({ initialForm }: FormBuilderProps) {
  const router = useRouter()
  const [name, setName] = useState(initialForm?.name ?? "")
  const [description, setDescription] = useState(initialForm?.description ?? "")
  const [fields, setFields] = useState<FieldConfig[]>(initialForm?.fields ?? [])
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
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  // null = form settings panel; string = field editor
  const [rightPanel, setRightPanel] = useState<"settings" | "field">("settings")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(initialForm?.is_published ?? false)
  const [attendanceDialog, setAttendanceDialog] = useState(false)

  const isEditing = !!initialForm

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
      "entry_exit", "dropdown", "multiselect", "checkbox", "star_rating", "date",
    ])
    const newField: FieldConfig = {
      id: nanoid(),
      type,
      label: "",
      required: false,
      // Placeholder for text-like fields only
      ...(!layout && !noPlaceholderTypes.has(type) ? { placeholder: "" } : {}),
      // Options for select fields
      ...(type === "dropdown" || type === "multiselect" ? { options: [] } : {}),
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

  const handleSave = useCallback(
    async (publish?: boolean) => {
      if (!name.trim()) {
        toast.error("אנא תן שם לטופס")
        return
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
            ...(dirField && { attendance_direction_field: dirField.id }),
            ...(idField && { attendance_id_field: idField.id }),
          },
          schema: {},
          ...(publish !== undefined ? { is_published: publish } : {}),
        }

        let result
        if (isEditing) {
          result = await updateForm(initialForm.id, payload)
        } else {
          result = await createForm(payload)
        }

        if (result.error) {
          toast.error(result.error)
          return
        }

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
    [name, description, fields, formType, submitLabel, afterSubmit, redirectUrl, isEditing, initialForm, router]
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
                <FieldEditorPanel field={selectedField} onChange={updateField} />
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

                  {/* Attendance template */}
                  {(!isEditing || formType === "general") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAttendanceDialog(true)}
                      className="w-full h-8 rounded-xl gap-1.5 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      תבנית מהירה: נוכחות
                    </Button>
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
    </>
  )
}
