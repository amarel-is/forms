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
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
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
    const newField: FieldConfig = {
      id: nanoid(),
      type,
      label: "",
      required: false,
      // Only add placeholder for text input fields
      ...(!layout && type !== "entry_exit" && type !== "dropdown" && type !== "multiselect"
        ? { placeholder: "" }
        : {}),
      // Only add options for select fields
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
    [name, description, fields, formType, submitLabel, isEditing, initialForm, router]
  )

  return (
    <>
      <div className="flex flex-col h-screen bg-neutral-50">
        {/* Header */}
        <header className="shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg shrink-0">
              <Link href="/dashboard">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <div className="flex items-center gap-2 min-w-0">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="טופס ללא שם"
                className="border-0 shadow-none bg-transparent px-0 text-sm font-semibold text-neutral-900 h-auto focus-visible:ring-0 placeholder:text-neutral-400 w-full max-w-xs"
              />
              {formType === "attendance" && (
                <Badge className="text-xs rounded-lg shrink-0 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
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
                className="rounded-xl gap-1.5 h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Link href={`/forms/${initialForm.id}/attendance`}>
                  <Users className="h-3.5 w-3.5" />
                  לוח נוכחות
                </Link>
              </Button>
            )}

            {isEditing && (
              <Button variant="ghost" size="sm" asChild className="rounded-xl gap-1.5 h-8 text-xs">
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
                className="rounded-xl gap-1.5 h-8 text-xs hidden sm:flex"
              >
                <Link href={`/f/${initialForm.id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" />
                  תצוגה מקדימה
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving}
              className="rounded-xl gap-1.5 h-8 text-xs"
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
              className="rounded-xl gap-1.5 h-8 text-xs"
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

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Right panel (RTL start) — field list */}
          <div className="w-72 shrink-0 bg-white border-s border-neutral-200 flex flex-col overflow-hidden order-last">
            {/* Description + quick actions */}
            <div className="p-4 border-b border-neutral-100 space-y-3">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="הוסף תיאור (אופציונלי)"
                rows={2}
                className="text-xs text-neutral-600 resize-none border-0 shadow-none bg-neutral-50 rounded-xl p-3 focus-visible:ring-0 placeholder:text-neutral-400"
              />

              <div className="flex gap-2">
                {/* Form settings button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openSettings}
                  className={`flex-1 h-8 rounded-xl gap-1.5 text-xs ${
                    rightPanel === "settings"
                      ? "border-neutral-900 bg-neutral-50"
                      : ""
                  }`}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  הגדרות
                </Button>

                {(!isEditing || formType === "general") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAttendanceDialog(true)}
                    className="flex-1 h-8 rounded-xl gap-1.5 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    נוכחות
                  </Button>
                )}
              </div>
            </div>

            {/* Field list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {fields.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-neutral-400">
                    אין שדות עדיין. הוסף שדה ראשון למטה.
                  </p>
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
                        isSelected={rightPanel === "field" && selectedFieldId === field.id}
                        onSelect={() => selectField(field.id)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="p-3 border-t border-neutral-100">
              <AddFieldButton onAdd={addField} />
            </div>
          </div>

          {/* Left panel (RTL end) — field editor OR form settings */}
          <div className="flex-1 overflow-y-auto p-6">
            {rightPanel === "field" && selectedField ? (
              <div className="max-w-md mx-auto bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <FieldEditorPanel field={selectedField} onChange={updateField} />
              </div>
            ) : rightPanel === "settings" ? (
              <div className="max-w-md mx-auto space-y-4">
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <Settings2 className="h-4 w-4 text-neutral-500" />
                    <h3 className="text-sm font-semibold text-neutral-700">הגדרות טופס</h3>
                  </div>

                  <Separator className="mb-5" />

                  {/* Submit button label */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      טקסט כפתור השליחה
                    </Label>
                    <Input
                      value={submitLabel}
                      onChange={(e) => setSubmitLabel(e.target.value)}
                      placeholder={formType === "attendance" ? "שלח דיווח" : "שלח"}
                      className="h-10 rounded-xl text-sm"
                    />
                    <p className="text-xs text-neutral-400">
                      ברירת מחדל: &ldquo;{formType === "attendance" ? "שלח דיווח" : "שלח"}&rdquo;
                    </p>
                  </div>

                  <Separator className="my-5" />

                  {/* Preview of the button */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      תצוגה מקדימה
                    </Label>
                    <div className="flex justify-center">
                      <div className="bg-neutral-900 text-white rounded-xl px-8 py-3 text-sm font-semibold">
                        {submitLabel.trim() ||
                          (formType === "attendance" ? "שלח דיווח" : "שלח")}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-5" />

                  {/* Form stats */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                      סיכום
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-neutral-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-neutral-800">
                          {fields.filter((f) => !isLayoutField(f.type)).length}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">שאלות</div>
                      </div>
                      <div className="bg-violet-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-violet-700">
                          {fields.filter((f) => isLayoutField(f.type)).length}
                        </div>
                        <div className="text-xs text-violet-500 mt-0.5">אלמנטי עיצוב</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                  <Settings2 className="h-6 w-6 text-neutral-300" />
                </div>
                <p className="text-sm font-medium text-neutral-500">בחר שדה לעריכה</p>
                <p className="text-xs text-neutral-400 mt-1">
                  לחץ על כל שדה בצד ימין, או על &ldquo;הגדרות&rdquo; לקביעת כפתור השליחה
                </p>
              </div>
            )}
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
              { icon: "👤", label: "שם מלא", desc: "טקסט" },
              { icon: "🪪", label: "תעודת זהות", desc: "טקסט" },
              { icon: "🏢", label: "חטיבה", desc: "רשימה נפתחת" },
              { icon: "↔️", label: "כניסה / יציאה", desc: "לחצן בחירה" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 bg-neutral-50 rounded-xl p-3">
                <span className="text-base">{f.icon}</span>
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
