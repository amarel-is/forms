import type { Metadata } from "next"
import Image from "next/image"
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
          <Image
            src="/logos/amarel.png"
            alt="Amarel"
            width={180}
            height={60}
            priority
            className="mb-2"
          />
          <p className="text-sm text-neutral-400">
            מערכת טפסים וסקרים
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
