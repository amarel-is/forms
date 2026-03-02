"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, RefreshCw, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

const CHARSET =
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+"

function generatePassword(length = 16): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((byte) => CHARSET[byte % CHARSET.length])
    .join("")
}

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    const pwd = generatePassword()
    setNewPassword(pwd)
    setConfirmPassword(pwd)
    setShowNew(true)
    setShowConfirm(true)
  }

  async function handleCopy() {
    if (!newPassword) return
    await navigator.clipboard.writeText(newPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error("הסיסמה חייבת להכיל לפחות 8 תווים")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success("הסיסמה עודכנה בהצלחה!")
      setNewPassword("")
      setConfirmPassword("")
      setShowNew(false)
      setShowConfirm(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "אירעה שגיאה, נסה שוב"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
        שינוי סיסמה
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-password" className="text-sm font-medium">
              סיסמה חדשה
            </Label>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-500 font-medium transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              צור סיסמה חזקה
            </button>
          </div>

          <div className="relative">
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              placeholder="לפחות 8 תווים"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={`h-10 rounded-xl pr-10 ${
                passwordTooShort ? "border-red-300 focus-visible:ring-red-300" : ""
              }`}
              dir="ltr"
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1">
              {newPassword && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors"
                  title="העתק סיסמה"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {passwordTooShort && (
            <p className="text-xs text-red-500">הסיסמה חייבת להכיל לפחות 8 תווים</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-sm font-medium">
            אימות סיסמה
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="הזן שוב את הסיסמה"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={`h-10 rounded-xl pr-10 ${
                confirmPassword.length > 0 && !passwordsMatch
                  ? "border-red-300 focus-visible:ring-red-300"
                  : passwordsMatch
                  ? "border-green-400 focus-visible:ring-green-300"
                  : ""
              }`}
              dir="ltr"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-1">
              {confirmPassword.length > 0 && (
                <span className="p-1.5">
                  {passwordsMatch ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : null}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                {showConfirm ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-500">הסיסמאות אינן תואמות</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-10 rounded-xl font-medium"
          disabled={loading || !newPassword || !confirmPassword || !passwordsMatch || passwordTooShort}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "עדכן סיסמה"}
        </Button>
      </form>
    </div>
  )
}
