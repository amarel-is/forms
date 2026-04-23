"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { stopImpersonation } from "@/lib/actions/impersonate"

export function StopImpersonatingButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const result = await stopImpersonation()
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    // Hard reload so the new (restored) session cookie is picked up by the server
    window.location.href = "/dashboard"
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ArrowLeft className="h-3.5 w-3.5" />
      )}
      חזור לחשבון שלך
    </button>
  )
}
