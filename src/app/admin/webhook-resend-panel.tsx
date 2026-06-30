"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Send, Webhook } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  resendFormResponsesToWebhooks,
  type ResendFormOption,
} from "@/lib/actions/webhooks"

export function WebhookResendPanel({ forms }: { forms: ResendFormOption[] }) {
  const [formId, setFormId] = useState(forms[0]?.id ?? "")
  const [mode, setMode] = useState<"all" | "last">("last")
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)

  const selected = forms.find((f) => f.id === formId)

  async function handleSend() {
    if (!formId) return
    const label =
      mode === "all"
        ? `כל ${selected?.response_count ?? ""} התגובות`
        : `${count} התגובות האחרונות`
    if (
      !confirm(
        `לשלוח שוב ל-Webhook את ${label} של הטופס "${selected?.name}"?\nכל תגובה תישלח מחדש ל-Make.`
      )
    )
      return

    setBusy(true)
    const res = await resendFormResponsesToWebhooks(formId, mode, count)
    setBusy(false)

    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(
      `נשלחו ${res.sent} בקשות (${res.total} תגובות × ${res.webhooks} webhook)` +
        (res.failed ? ` · ${res.failed} נכשלו` : "")
    )
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
          onChange={(e) => setFormId(e.target.value)}
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
          <input
            type="radio"
            name="resend-mode"
            checked={mode === "last"}
            onChange={() => setMode("last")}
          />
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
          התגובות האחרונות
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input
            type="radio"
            name="resend-mode"
            checked={mode === "all"}
            onChange={() => setMode("all")}
          />
          כל התגובות{selected ? ` (${selected.response_count})` : ""}
        </label>
      </div>

      <Button
        onClick={handleSend}
        disabled={busy || !formId}
        className="h-11 rounded-xl gap-2 bg-orange-600 hover:bg-orange-500 text-white"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        שלח שוב ל-Webhook
      </Button>

      <p className="text-xs text-neutral-400 leading-relaxed">
        כל תגובה תישלח מחדש ל-Webhook הפעיל של הטופס (עם השדות{" "}
        <code className="text-[11px]">answers</code> ו-<code className="text-[11px]">resolved</code>),
        מסומנת ב-<code className="text-[11px]">resent: true</code>. שליחה מרובה מתבצעת בהשהיה קלה
        כדי לא להעמיס על Make.
      </p>
    </div>
  )
}
