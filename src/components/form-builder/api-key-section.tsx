"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Key, Copy, RefreshCw, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { generateApiKey, getApiKey, revokeApiKey } from "@/lib/actions/api-keys"

export function ApiKeySection({ formId }: { formId: string }) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    getApiKey(formId).then((res) => {
      if (res.api_key) setApiKey(res.api_key)
      setLoading(false)
    })
  }, [formId])

  async function handleGenerate() {
    setGenerating(true)
    const res = await generateApiKey(formId)
    if (res.api_key) {
      setApiKey(res.api_key)
      toast.success("מפתח API נוצר")
    } else {
      toast.error(res.error ?? "שגיאה ביצירת מפתח")
    }
    setGenerating(false)
  }

  async function handleRevoke() {
    const res = await revokeApiKey(formId)
    if (res.success) {
      setApiKey(null)
      toast.success("מפתח API בוטל")
    } else {
      toast.error(res.error ?? "שגיאה בביטול מפתח")
    }
  }

  function handleCopy() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
      toast.success("הועתק!")
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide flex items-center gap-1.5">
          <Key className="h-3.5 w-3.5" />
          מפתח API
        </Label>
        <div className="text-xs text-neutral-400">טוען...</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-neutral-600 uppercase tracking-wide flex items-center gap-1.5">
        <Key className="h-3.5 w-3.5" />
        מפתח API
      </Label>

      {apiKey ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 bg-neutral-50 rounded-lg px-3 py-2">
            <code className="text-[11px] text-neutral-600 flex-1 truncate font-mono" dir="ltr">
              {apiKey}
            </code>
            <button type="button" onClick={handleCopy} className="text-neutral-400 hover:text-neutral-600 shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 h-7 rounded-lg gap-1 text-[11px]"
            >
              <RefreshCw className="h-3 w-3" />
              חדש מפתח
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevoke}
              className="h-7 rounded-lg gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
              בטל
            </Button>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            שלח את המפתח ב-header בשם <code className="bg-neutral-100 px-1 rounded" dir="ltr">x-api-key</code>.
            ה-<code className="bg-neutral-100 px-1 rounded" dir="ltr">submission_id</code> משורשר אוטומטית ל-redirect URL.
          </p>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            לעדכון הגשה (<code className="bg-neutral-100 px-1 rounded" dir="ltr">PATCH</code>) — שלח את השדות ב-JSON,
            למשל <code className="bg-neutral-100 px-1 rounded" dir="ltr">{`{"barcode":"5889"}`}</code>.
            שדות חדשים שאינם בטופס יופיעו כעמודות נוספות בתוצאות.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            צור מפתח API כדי לאפשר לשירותים חיצוניים (Make.com, Zapier) לקרוא ולעדכן הגשות.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full h-8 rounded-xl gap-1.5 text-xs"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
            צור מפתח API
          </Button>
        </div>
      )}
    </div>
  )
}
