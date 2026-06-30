"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Send, Webhook, Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  resendFormResponsesToWebhooks,
  listFormResponsesForResend,
  type ResendFormOption,
  type ResendResponseItem,
} from "@/lib/actions/webhooks"

type Mode = "last" | "all" | "selected"

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function WebhookResendPanel({ forms }: { forms: ResendFormOption[] }) {
  const [formId, setFormId] = useState(forms[0]?.id ?? "")
  const [mode, setMode] = useState<Mode>("last")
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)

  // Cherry-pick state
  const [items, setItems] = useState<ResendResponseItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const selectedForm = forms.find((f) => f.id === formId)

  // Load a form's responses for the cherry-pick list (triggered by user actions,
  // not an effect — avoids cascading renders).
  async function loadItems(fid: string) {
    if (!fid) return
    setLoadingItems(true)
    setSelected(new Set())
    setSearch("")
    const res = await listFormResponsesForResend(fid)
    setLoadingItems(false)
    if (res.error) {
      toast.error(res.error)
      setItems([])
      return
    }
    setItems(res.responses)
  }

  function handleFormChange(id: string) {
    setFormId(id)
    if (mode === "selected") loadItems(id)
  }

  function pickSelectedMode() {
    setMode("selected")
    loadItems(formId)
  }

  const filtered = items.filter((it) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return it.label.toLowerCase().includes(q) || it.id.includes(q)
  })

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev)
      filtered.forEach((it) => next.add(it.id))
      return next
    })
  }
  function clearSelection() {
    setSelected(new Set())
  }

  async function handleSend() {
    if (!formId) return
    let confirmLabel: string
    if (mode === "selected") {
      if (selected.size === 0) {
        toast.error("לא נבחרו תגובות.")
        return
      }
      confirmLabel = `${selected.size} תגובות שנבחרו`
    } else if (mode === "all") {
      confirmLabel = `כל ${selectedForm?.response_count ?? ""} התגובות`
    } else {
      confirmLabel = `${count} התגובות האחרונות`
    }
    if (!confirm(`לשלוח שוב ל-Webhook את ${confirmLabel} של "${selectedForm?.name}"?`)) return

    setBusy(true)
    const res = await resendFormResponsesToWebhooks(
      formId,
      mode,
      count,
      mode === "selected" ? Array.from(selected) : undefined
    )
    setBusy(false)

    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(
      `נשלחו ${res.sent} בקשות (${res.total} תגובות × ${res.webhooks} webhook)` +
        (res.failed ? ` · ${res.failed} נכשלו` : "")
    )
    // refresh delivered badges after a cherry-pick send
    if (mode === "selected") {
      const ref = await listFormResponsesForResend(formId)
      if (!ref.error) setItems(ref.responses)
    }
  }

  if (forms.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
          <Webhook className="w-6 h-6 text-neutral-400" />
        </div>
        <p className="text-sm text-neutral-500">אין טפסים עם Webhook פעיל.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      {/* Form picker */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700">טופס</label>
        <select
          value={formId}
          onChange={(e) => handleFormChange(e.target.value)}
          className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
          dir="rtl"
        >
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · {f.response_count} תגובות · {f.webhook_count} webhook
              {f.owner_email ? ` · ${f.owner_email}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Mode */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input type="radio" name="resend-mode" checked={mode === "last"} onChange={() => setMode("last")} />
          רק
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            onFocus={() => setMode("last")}
            className="w-20 h-9 rounded-lg border border-neutral-200 px-2 text-sm text-center"
          />
          האחרונות
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input type="radio" name="resend-mode" checked={mode === "all"} onChange={() => setMode("all")} />
          כל התגובות{selectedForm ? ` (${selectedForm.response_count})` : ""}
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input type="radio" name="resend-mode" checked={mode === "selected"} onChange={pickSelectedMode} />
          בחירה ידנית (Cherry Pick)
        </label>
      </div>

      {/* Cherry-pick list */}
      {mode === "selected" && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60">
          <div className="flex items-center gap-2 p-2.5 border-b border-neutral-200">
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם או מזהה…"
                className="w-full h-9 rounded-lg border border-neutral-200 ps-3 pe-8 text-sm"
                dir="rtl"
              />
            </div>
            <button type="button" onClick={selectAllFiltered} className="text-xs text-orange-600 hover:underline whitespace-nowrap">
              בחר הכל ({filtered.length})
            </button>
            <button type="button" onClick={clearSelection} className="text-xs text-neutral-500 hover:underline whitespace-nowrap">
              נקה
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
            {loadingItems ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" /> טוען תגובות…
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">אין תגובות תואמות.</p>
            ) : (
              filtered.map((it) => {
                const checked = selected.has(it.id)
                return (
                  <label
                    key={it.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white ${checked ? "bg-orange-50/70" : ""}`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(it.id)} className="shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-neutral-800">
                      {it.label || <span className="text-neutral-400">— ללא שם —</span>}
                    </span>
                    {it.delivered && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 rounded-md px-1.5 py-0.5">
                        <Check className="h-3 w-3" /> נשלח
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] text-neutral-400 tabular-nums">{fmtDate(it.submitted_at)}</span>
                  </label>
                )
              })
            )}
          </div>

          <div className="px-3 py-2 border-t border-neutral-200 text-xs text-neutral-500">
            נבחרו {selected.size} מתוך {items.length}
          </div>
        </div>
      )}

      <Button
        onClick={handleSend}
        disabled={busy || !formId || (mode === "selected" && selected.size === 0)}
        className="h-11 rounded-xl gap-2 bg-orange-600 hover:bg-orange-500 text-white"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        שלח שוב ל-Webhook
      </Button>

      <p className="text-xs text-neutral-400 leading-relaxed">
        כל תגובה תישלח מחדש ל-Webhook הפעיל של הטופס (עם השדות{" "}
        <code className="text-[11px]">answers</code> ו-<code className="text-[11px]">resolved</code>),
        מסומנת ב-<code className="text-[11px]">resent: true</code>. תווית ״נשלח״ מבוססת על לוג מסירה
        מוצלח (2xx) ולכן לא מציגה שליחות ידניות שבוצעו מחוץ למערכת.
      </p>
    </div>
  )
}
