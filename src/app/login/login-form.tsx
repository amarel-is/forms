"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

type Mode = "signin" | "signup"

export default function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success("חשבון נוצר! בדוק את האימייל שלך לאימות.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "אירעה שגיאה, נסה שוב"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border border-neutral-200 shadow-sm rounded-2xl">
      <form onSubmit={handleSubmit}>
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
