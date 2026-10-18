"use client"

import { useState, type ReactNode } from "react"
import { nanoid } from "nanoid"
import { ChevronDown, ChevronUp, Plus, Trash2, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  REPEATER_SUB_FIELD_TYPES,
  type FieldConfig,
  type RepeaterSubFieldType,
} from "@/lib/types"

const SUB_TYPE_LABEL: Record<RepeaterSubFieldType, string> = {
  text: "תשובה קצרה",
  long_answer: "תשובה ארוכה",
  number: "מספר",
  date: "תאריך",
  dropdown: "רשימה נפתחת",
  radio: "כפתורי רדיו",
  multiselect: "בחירה מרובה",
  checkbox: "צ'קבוקס",
}

interface RepeaterEditorProps {
  field: FieldConfig
  update: (patch: Partial<FieldConfig>) => void
  /** Renders the regular field editor for one sub-field */
  renderSubEditor: (sub: FieldConfig, onChange: (updated: FieldConfig) => void) => ReactNode
}

export function RepeaterEditor({ field, update, renderSubEditor }: RepeaterEditorProps) {
  const subFields = field.sub_fields ?? []
  const [openId, setOpenId] = useState<string | null>(null)
  const [newType, setNewType] = useState<RepeaterSubFieldType>("text")

  function setSubFields(next: FieldConfig[]) {
    const patch: Partial<FieldConfig> = { sub_fields: next }
    if (field.item_title_field_id && !next.some((s) => s.id === field.item_title_field_id)) {
      patch.item_title_field_id = undefined
    }
    update(patch)
  }

  function addSubField() {
    const sub: FieldConfig = {
      id: nanoid(),
      type: newType,
      label: "",
      required: false,
      ...(newType === "text" || newType === "long_answer" || newType === "number" ? { placeholder: "" } : {}),
      ...(newType === "dropdown" || newType === "radio" || newType === "multiselect" ? { options: [] } : {}),
    }
    setSubFields([...subFields, sub])
    setOpenId(sub.id)
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= subFields.length) return
    const next = [...subFields]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSubFields(next)
  }

  function numOrUndef(v: string): number | undefined {
    if (v.trim() === "") return undefined
    const n = Math.floor(Number(v))
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }

  return (
    <div className="space-y-4">
      {/* Help text */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
          טקסט הסבר
        </Label>
        <Input
          value={field.placeholder ?? ""}
          onChange={(e) => update({ placeholder: e.target.value })}
          placeholder="לדוגמה: מלא את הפרטים עבור כל עובד בצוות"
          className="h-9 rounded-xl text-sm"
        />
      </div>

      {/* Item naming */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-neutral-500">שם לפריט</Label>
          <Input
            value={field.item_label ?? ""}
            onChange={(e) => update({ item_label: e.target.value })}
            placeholder="לדוגמה: עובד"
            className="h-9 rounded-xl text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-neutral-500">טקסט כפתור ההוספה</Label>
          <Input
            value={field.add_button_label ?? ""}
            onChange={(e) => update({ add_button_label: e.target.value })}
            placeholder={`הוסף ${field.item_label?.trim() || "פריט"}`}
            className="h-9 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Item count limits */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-neutral-500">מינימום פריטים</Label>
          <Input
            type="number"
            min={1}
            value={field.min_items ?? ""}
            onChange={(e) => update({ min_items: numOrUndef(e.target.value) })}
            placeholder="1"
            className="h-9 rounded-xl text-sm text-center"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-neutral-500">מקסימום פריטים</Label>
          <Input
            type="number"
            min={1}
            value={field.max_items ?? ""}
            onChange={(e) => update({ max_items: numOrUndef(e.target.value) })}
            placeholder="ללא הגבלה"
            className="h-9 rounded-xl text-sm text-center"
          />
        </div>
      </div>

      {/* Card title */}
      {subFields.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[11px] text-neutral-500">שדה שיוצג ככותרת של כל פריט</Label>
          <Select
            value={field.item_title_field_id ?? "__none__"}
            onValueChange={(v) => update({ item_title_field_id: v === "__none__" ? undefined : v })}
            dir="rtl"
          >
            <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="__none__" className="text-sm text-neutral-400">ללא (רק מספר הפריט)</SelectItem>
              {subFields
                .filter((s) => s.type !== "checkbox" && s.type !== "multiselect")
                .map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-sm">{s.label || "שדה ללא שם"}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sub-fields */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
          השדות בכל פריט
        </Label>

        {subFields.length === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            הוסף לפחות שדה אחד לקבוצה.
          </p>
        )}

        {subFields.map((sf, index) => {
          const open = openId === sf.id
          return (
            <div key={sf.id} className={`rounded-xl border ${open ? "border-neutral-400" : "border-neutral-200"} bg-white`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : sf.id)}
                  className="flex-1 min-w-0 text-start"
                >
                  <p className="text-sm font-medium text-neutral-800 truncate">{sf.label || "שדה ללא שם"}</p>
                  <p className="text-[11px] text-neutral-400">
                    {SUB_TYPE_LABEL[sf.type as RepeaterSubFieldType] ?? sf.type}
                  </p>
                </button>
                {sf.required && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md">חובה</Badge>
                )}
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0}
                  className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30" aria-label="הזז למעלה">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === subFields.length - 1}
                  className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30" aria-label="הזז למטה">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setOpenId(open ? null : sf.id)}
                  className="text-neutral-400 hover:text-neutral-700" aria-label="ערוך שדה">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setSubFields(subFields.filter((s) => s.id !== sf.id))}
                  className="text-neutral-400 hover:text-red-500" aria-label="מחק שדה">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {open && (
                <div className="border-t border-neutral-200 p-3 bg-neutral-50/60">
                  {renderSubEditor(sf, (updated) =>
                    setSubFields(subFields.map((s) => (s.id === updated.id ? updated : s)))
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="flex items-center gap-2">
          <Select value={newType} onValueChange={(v) => setNewType(v as RepeaterSubFieldType)} dir="rtl">
            <SelectTrigger className="h-9 rounded-xl text-sm flex-1"><SelectValue /></SelectTrigger>
            <SelectContent dir="rtl">
              {REPEATER_SUB_FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-sm">{SUB_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={addSubField}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            הוסף שדה
          </button>
        </div>
      </div>
    </div>
  )
}
