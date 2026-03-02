import { Metadata } from "next"
import LoginForm from "./login-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "כניסה",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-3xl font-bold text-[#2D4458]">אמרל</span>
            <span className="text-neutral-300 text-xl">|</span>
            <span className="text-xl font-normal text-neutral-500">טפסים</span>
          </div>
          <p className="text-sm text-neutral-400">
            מערכת טפסים ומשאלות פנים-ארגונית
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
