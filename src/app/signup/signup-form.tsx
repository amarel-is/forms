"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, RefreshCw, Copy, Check, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { registerUser } from "@/lib/actions/auth"

const DIVISIONS = [
  "אינטגרציה וניסויים",
  "אימונים ומערכות אימון",
  "אחזקה",
  "תנופ\"ה",
  "מטה",
  "AES",
]

function generatePassword(length = 14): string {
  const lower = "abcdefghijkmnopqrstuvwxyz"
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const digits = "23456789"
  const symbols = "!@#$%^&*-_"
  const all = lower + upper + digits + symbols
  // Guarantee at least one of each class, then fill the rest
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)]
  for (let i = chars.length; i < length; i++) chars.push(pick(all))
  // Shuffle (Fisher–Yates)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("")
  const [division, setDivision] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function handleGenerate() {
    const pw = generatePassword()
    setPassword(pw)
    setShowPassword(true)
    setCopied(false)
  }

  async function handleCopy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("העתקה נכשלה")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await registerUser({ email, password, fullName, role, division })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Card className="border border-neutral-200 shadow-sm rounded-2xl">
        <CardContent className="pt-8 pb-6 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">ההרשמה נקלטה!</h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            החשבון שלך נוצר וממתין לאישור מנהל המערכת. תקבל גישה לאחר האישור — שמור את הסיסמה
            שבחרת לכניסה.
          </p>
          <Link
            href="/login"
            className="mt-2 text-sm font-medium text-neutral-900 hover:underline"
          >
            חזרה לכניסה
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-neutral-200 shadow-sm rounded-2xl">
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">אימייל ארגוני</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@amarel.net"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 rounded-xl"
              dir="ltr"
            />
            <p className="text-xs text-neutral-400">ההרשמה פתוחה לכתובות @amarel.net בלבד.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium">שם מלא</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="ישראל ישראלי"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-sm font-medium">תפקיד</Label>
            <Input
              id="role"
              type="text"
              placeholder="לדוגמה: מנהל/ת פרויקטים"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="division" className="text-sm font-medium">חטיבה</Label>
            <select
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              required
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              <option value="" disabled>בחר/י חטיבה…</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">סיסמה</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="לפחות 8 תווים"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-10 rounded-xl pe-9"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 end-0 px-2.5 flex items-center text-neutral-400 hover:text-neutral-700"
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerate}
                className="h-10 rounded-xl px-3 gap-1.5 shrink-0"
                title="חולל סיסמה חזקה"
              >
                <RefreshCw className="h-4 w-4" />
                חולל
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={!password}
                className="h-10 rounded-xl px-3 shrink-0"
                title="העתק סיסמה"
                aria-label="העתק סיסמה"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-neutral-400">לחצ/י על &quot;חולל&quot; לסיסמה חזקה — והעתיק/י אותה לפני שליחה.</p>
          </div>

          <Button type="submit" className="w-full h-10 rounded-xl font-medium" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "הרשמה"}
          </Button>
        </CardContent>

        <CardFooter className="pb-6 flex justify-center">
          <p className="text-sm text-neutral-500">
            כבר יש לך חשבון?{" "}
            <Link href="/login" className="text-neutral-900 font-medium hover:underline">
              כניסה
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
