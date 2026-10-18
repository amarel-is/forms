"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Filter,
  Download,
  Eye,
  Lock,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  isLayoutField,
  responseMatchesShareLink,
  SUBMITTED_AT_COLUMN,
  type FieldConfig,
  type ResultShareLink,
  type AnswerData,
} from "@/lib/types"
import { createShareLink, setShareLinkActive, deleteShareLink } from "@/lib/actions/share-links"

const FILTER_TYPES = ["dropdown", "radio", "multiselect"]

interface ShareLinksPanelProps {
  formId: string
  fields: FieldConfig[]
  initialLinks: ResultShareLink[]
  /** Response data limited to the choice fields — used for live match counts. */
  responsesData: Array<AnswerData>
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-")
  return `${Number(day)}.${Number(m)}.${y}`
}

function Toggle({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-green-600" : "bg-neutral-300"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${on ? "right-[18px]" : "right-0.5"}`}
      />
    </button>
  )
}

export function ShareLinksPanel({ formId, fields, initialLinks, responsesData }: ShareLinksPanelProps) {
  const [links, setLinks] = useState(initialLinks)
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filterFields = useMemo(() => fields.filter((f) => FILTER_TYPES.includes(f.type) && f.label), [fields])
  const columnOptions = useMemo(
    () => [
      ...fields.filter((f) => !isLayoutField(f.type) && f.label).map((f) => ({ id: f.id, label: f.label })),
      { id: SUBMITTED_AT_COLUMN, label: "זמן שליחה" },
    ],
    [fields]
  )
  const labelOf = (id: string) => fields.find((f) => f.id === id)?.label ?? "שדה שנמחק"
  const countMatches = (link: Pick<ResultShareLink, "filter_field_id" | "filter_values">) =>
    responsesData.filter((d) => responseMatchesShareLink(d, link)).length

  function linkUrl(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://forms.amarel.net"
    return `${origin}/r/${token}`
  }

  function copy(link: ResultShareLink) {
    navigator.clipboard.writeText(linkUrl(link.token))
    setCopiedId(link.id)
    toast.success("הקישור הועתק")
    setTimeout(() => setCopiedId(null), 1500)
  }

  async function toggle(link: ResultShareLink) {
    setBusyId(link.id)
    const res = await setShareLinkActive(link.id, !link.is_active)
    setBusyId(null)
    if (res.error || !res.link) return toast.error(res.error ?? "שגיאה בעדכון הקישור")
    setLinks((prev) => prev.map((l) => (l.id === link.id ? res.link! : l)))
    toast.success(res.link.is_active ? "הקישור הופעל" : "הקישור הושבת — הצופים יראו שהוא אינו פעיל")
  }

  async function remove(link: ResultShareLink) {
    if (confirmDeleteId !== link.id) {
      setConfirmDeleteId(link.id)
      setTimeout(() => setConfirmDeleteId((cur) => (cur === link.id ? null : cur)), 3000)
      return
    }
    setBusyId(link.id)
    const res = await deleteShareLink(link.id)
    setBusyId(null)
    setConfirmDeleteId(null)
    if (res.error) return toast.error(res.error)
    setLinks((prev) => prev.filter((l) => l.id !== link.id))
    toast.success("הקישור נמחק")
  }

  const activeCount = links.filter((l) => l.is_active).length

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-8 w-8 shrink-0 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Link2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-800">קישורי שיתוף תוצאות</h2>
            <p className="text-xs text-neutral-500">קישורים לצפייה בתוצאות מסוננות, בלי צורך בהתחברות</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {links.length > 0 && (
            <span className="text-xs text-neutral-500 hidden sm:inline">
              {links.length} קישורים · {activeCount} פעילים
            </span>
          )}
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            disabled={filterFields.length === 0}
            title={filterFields.length === 0 ? "כדי לשתף תוצאות מסוננות צריך שדה בחירה בטופס" : undefined}
            className="h-8 rounded-xl gap-1.5 text-xs bg-orange-600 hover:bg-orange-500 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            קישור חדש
          </Button>
        </div>
      </div>

      {filterFields.length === 0 ? (
        <p className="text-xs text-neutral-500 py-4">
          כדי לשתף תוצאות מסוננות, הוסף לטופס שדה בחירה (רשימה נפתחת, בחירה יחידה או רב-בחירה).
        </p>
      ) : links.length === 0 ? (
        <p className="text-xs text-neutral-500 py-4">
          עדיין לא נוצרו קישורים. צור קישור כדי לשתף רק את ההגשות הרלוונטיות — למשל רק את נרשמי סדנה אחת.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 mt-2">
          {links.map((l) => (
            <div key={l.id} className={`py-3 flex items-center gap-3 ${l.is_active ? "" : "opacity-70"}`}>
              <Toggle
                on={l.is_active}
                disabled={busyId === l.id}
                onClick={() => toggle(l)}
                label={l.is_active ? "השבת קישור" : "הפעל קישור"}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-800 truncate">{l.name}</span>
                  <span
                    className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${
                      l.is_active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-neutral-100 text-neutral-500 border-neutral-200"
                    }`}
                  >
                    {l.is_active ? "פעיל" : "מושבת"}
                  </span>
                </div>
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-[11px] text-neutral-500">
                  <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 text-orange-700 px-1.5 py-0.5">
                    <Filter className="h-3 w-3" />
                    {labelOf(l.filter_field_id)}: {l.filter_values.join(" / ")}
                  </span>
                  <span>{countMatches(l)} הגשות</span>
                  <span>{l.column_ids.length} עמודות</span>
                  <span className="inline-flex items-center gap-1">
                    {l.allow_download ? <Download className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {l.allow_download ? "צפייה והורדה" : "צפייה בלבד"}
                  </span>
                  {l.has_password && (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      מוגן בסיסמה
                    </span>
                  )}
                  <span>{l.view_count} צפיות</span>
                  {l.expires_at && <span>בתוקף עד {formatDate(l.expires_at)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => copy(l)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
                  title="העתק קישור"
                  aria-label="העתק קישור"
                >
                  {copiedId === l.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
                <a
                  href={`/r/${l.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
                  title="פתח כצופה"
                  aria-label="פתח כצופה"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => remove(l)}
                  disabled={busyId === l.id}
                  className={`h-8 min-w-8 px-2 rounded-lg flex items-center justify-center text-xs transition-colors ${
                    confirmDeleteId === l.id
                      ? "text-red-600 bg-red-50"
                      : "text-neutral-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                  title="מחק קישור"
                  aria-label="מחק קישור"
                >
                  {busyId === l.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : confirmDeleteId === l.id ? (
                    "למחוק?"
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <CreateLinkDialog
          formId={formId}
          filterFields={filterFields}
          columnOptions={columnOptions}
          countMatches={countMatches}
          onClose={() => setOpen(false)}
          onCreated={(link) => {
            setLinks((prev) => [link, ...prev])
            navigator.clipboard.writeText(linkUrl(link.token)).catch(() => {})
            toast.success("הקישור נוצר והועתק")
            setOpen(false)
          }}
        />
      )}
    </section>
  )
}

function CreateLinkDialog({
  formId,
  filterFields,
  columnOptions,
  countMatches,
  onClose,
  onCreated,
}: {
  formId: string
  filterFields: FieldConfig[]
  columnOptions: Array<{ id: string; label: string }>
  countMatches: (link: Pick<ResultShareLink, "filter_field_id" | "filter_values">) => number
  onClose: () => void
  onCreated: (link: ResultShareLink) => void
}) {
  const [name, setName] = useState("")
  const [fieldId, setFieldId] = useState(filterFields[0]?.id ?? "")
  const [values, setValues] = useState<string[]>([])
  const [columns, setColumns] = useState<string[]>(() =>
    [...columnOptions.slice(0, 3).map((c) => c.id), SUBMITTED_AT_COLUMN].filter((v, i, a) => a.indexOf(v) === i)
  )
  const [allowDownload, setAllowDownload] = useState(true)
  const [expiresAt, setExpiresAt] = useState("")
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const field = filterFields.find((f) => f.id === fieldId)
  const matchCount = values.length > 0 ? countMatches({ filter_field_id: fieldId, filter_values: values }) : null

  function toggleValue(v: string) {
    setError("")
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  function submit() {
    if (!name.trim()) return setError("תן לקישור שם")
    if (values.length === 0) return setError("בחר לפחות ערך אחד לסינון")
    if (columns.length === 0) return setError("בחר לפחות עמודה אחת להצגה")
    if (usePassword && password.trim().length < 4) return setError("הסיסמה צריכה לכלול לפחות 4 תווים")
    startTransition(async () => {
      const res = await createShareLink({
        formId,
        name,
        filterFieldId: fieldId,
        filterValues: values,
        // keep the form's field order
        columnIds: columnOptions.map((c) => c.id).filter((id) => columns.includes(id)),
        allowDownload,
        expiresAt: expiresAt || null,
        password: usePassword ? password : null,
      })
      if (res.error || !res.link) return setError(res.error ?? "שגיאה ביצירת הקישור")
      onCreated(res.link)
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 gap-0 max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="px-5 py-4 border-b border-neutral-100 text-right">
          <DialogTitle className="text-base">קישור שיתוף חדש</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600">שם הקישור</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              placeholder="סדנת צילום – רשימת משתתפים"
              className="h-10 rounded-xl text-sm"
              autoFocus
            />
            <p className="text-[11px] text-neutral-400">יוצג לצופה ככותרת העמוד</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <Filter className="h-3.5 w-3.5" />
              אילו הגשות יוצגו
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-neutral-500">לפי השדה</Label>
              <Select
                value={fieldId}
                onValueChange={(v) => {
                  setFieldId(v)
                  setValues([])
                }}
                dir="rtl"
              >
                <SelectTrigger className="h-9 rounded-xl text-sm bg-white">
                  <SelectValue placeholder="בחר שדה" />
                </SelectTrigger>
                <SelectContent>
                  {filterFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-neutral-500">כשהערך הוא אחד מאלה</Label>
              <div className="flex flex-wrap gap-1.5">
                {(field?.options ?? []).map((o) => {
                  const on = values.includes(o)
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggleValue(o)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        on
                          ? "bg-orange-50 border-orange-300 text-orange-700 font-medium"
                          : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {on && <Check className="inline h-3 w-3 ml-1" />}
                      {o}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600">עמודות שיוצגו לצופה</Label>
            <div className="rounded-xl border border-neutral-200 p-2 grid grid-cols-2 gap-1.5">
              {columnOptions.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer px-1 py-0.5 min-w-0">
                  <Checkbox
                    checked={columns.includes(c.id)}
                    onCheckedChange={(checked) => {
                      setError("")
                      setColumns((prev) => (checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                    }}
                  />
                  <span className="truncate">{c.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400">שדות שלא סומנו לא ייחשפו בקישור</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 h-10 text-sm">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <Download className="h-3.5 w-3.5 text-neutral-500" />
                לאפשר הורדה
              </span>
              <Toggle on={allowDownload} onClick={() => setAllowDownload((v) => !v)} label="לאפשר הורדה" />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 h-10 text-sm">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <Lock className="h-3.5 w-3.5 text-neutral-500" />
                הגנה בסיסמה
              </span>
              <Toggle on={usePassword} onClick={() => setUsePassword((v) => !v)} label="הגנה בסיסמה" />
            </div>
          </div>

          {usePassword && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-600">סיסמה</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                placeholder="לפחות 4 תווים"
                className="h-10 rounded-xl text-sm"
                autoComplete="off"
              />
              <p className="text-[11px] text-neutral-400">שמור אותה בצד — אחרי היצירה לא ניתן לצפות בה שוב</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600">תאריך תפוגה (אופציונלי)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-10 rounded-xl text-sm"
            />
            <p className="text-[11px] text-neutral-400">אחרי התאריך הזה הקישור יפסיק לעבוד אוטומטית</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter className="px-5 py-4 border-t border-neutral-100 flex-row items-center justify-between sm:justify-between gap-2">
          <span className="text-xs text-neutral-500">
            {matchCount !== null ? `${matchCount} הגשות תואמות כרגע` : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="h-9 rounded-xl text-sm">
              ביטול
            </Button>
            <Button
              onClick={submit}
              disabled={isPending}
              className="h-9 rounded-xl text-sm gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              צור קישור
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
