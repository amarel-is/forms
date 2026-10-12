"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Lock, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { unlockShareLink } from "@/lib/actions/share-links"

export function SharePasswordForm({ token, name }: { token: string; name: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return setError("הזינו סיסמה")
    startTransition(async () => {
      const res = await unlockShareLink(token, password)
      if (!res.ok) return setError(res.error ?? "הסיסמה שגויה. נסו שוב.")
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm py-12 px-6">
      <form onSubmit={submit} className="max-w-xs mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto text-orange-600">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-900">{name}</h1>
          <p className="text-sm text-neutral-500 mt-1">הקישור מוגן בסיסמה</p>
        </div>
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError("")
          }}
          placeholder="סיסמה"
          className="h-10 rounded-xl text-sm text-center"
          autoFocus
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-10 rounded-xl bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          כניסה
        </Button>
      </form>
    </div>
  )
}
