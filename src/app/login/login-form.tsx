"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

type Mode = "signin" | "signup"
type Step = "credentials" | "otp"

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "אימייל או סיסמה שגויים"
  if (m.includes("email not confirmed"))
    return "יש לאמת את כתובת האימייל תחילה"
  if (m.includes("user already registered") || m.includes("already registered"))
    return "כתובת האימייל כבר רשומה במערכת"
  if (m.includes("password should be at least"))
    return "הסיסמה חייבת להכיל לפחות 6 תווים"
  if (m.includes("token has expired") || m.includes("otp expired"))
    return "הקוד פג תוקף — שלח קוד חדש"
  if (m.includes("token is invalid") || m.includes("otp is invalid") || m.includes("invalid otp"))
    return "הקוד שגוי, נסה שוב"
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "יותר מדי ניסיונות — המתן מספר דקות ונסה שוב"
  if (m.includes("network") || m.includes("fetch"))
    return "בעיית חיבור לאינטרנט, נסה שוב"
  if (m.includes("signup is disabled"))
    return "ההרשמה מושבתת כרגע"
  return "אירעה שגיאה, נסה שוב"
}

export default function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("signin")
  const [step, setStep] = useState<Step>("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success("חשבון נוצר! בדוק את האימייל שלך לאימות.")
      } else {
        // Step 1: verify password
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError

        // Step 2: send OTP to email as second factor
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        })
        if (otpError) throw otpError

        toast.success("קוד אימות נשלח לאימייל שלך")
        setStep("otp")
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : ""
      toast.error(translateAuthError(raw))
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      })
      if (error) throw error

      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : ""
      toast.error(translateAuthError(raw))
      setOtp("")
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) {
      toast.error("שליחה נכשלה, נסה שוב")
    } else {
      toast.success("קוד חדש נשלח")
    }
  }

  // ── OTP verification step ─────────────────────────────────────
  if (step === "otp") {
    return (
      <Card className="border border-neutral-200 shadow-sm rounded-2xl">
        <form onSubmit={handleOtpSubmit}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-neutral-600" />
              </div>
              <p className="text-sm text-neutral-600 text-center">
                שלחנו קוד אימות לכתובת{" "}
                <span className="font-medium text-neutral-900">{email}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="otp" className="text-sm font-medium">
                קוד אימות (6 ספרות)
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                className="h-10 rounded-xl tracking-widest text-center text-lg"
                dir="ltr"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-xl font-medium"
              disabled={loading || otp.length < 6}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "אמת וכנס"}
            </Button>
          </CardContent>

          <CardFooter className="pb-6 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-sm text-neutral-500 hover:text-neutral-800 hover:underline"
            >
              לא קיבלת קוד? שלח מחדש
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials")
                setOtp("")
              }}
              className="text-sm text-neutral-400 hover:text-neutral-600 hover:underline"
            >
              חזור לכניסה
            </button>
          </CardFooter>
        </form>
      </Card>
    )
  }

  // ── Credentials step ──────────────────────────────────────────
  return (
    <Card className="border border-neutral-200 shadow-sm rounded-2xl">
      <form onSubmit={handleCredentialsSubmit}>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              אימייל
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 rounded-xl"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              סיסמה
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === "signup" ? "לפחות 6 תווים" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="h-10 rounded-xl"
              dir="ltr"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 rounded-xl font-medium"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              "כניסה"
            ) : (
              "יצירת חשבון"
            )}
          </Button>
        </CardContent>

        <CardFooter className="pb-6 flex justify-center">
          <p className="text-sm text-neutral-500">
            {mode === "signin" ? (
              <>
                אין לך חשבון?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-neutral-900 font-medium hover:underline"
                >
                  הרשמה
                </button>
              </>
            ) : (
              <>
                כבר יש לך חשבון?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-neutral-900 font-medium hover:underline"
                >
                  כניסה
                </button>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
