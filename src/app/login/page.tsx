import { Metadata } from "next"
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
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg, #2D4458 0%, #1e3347 100%)" }}
          >
            <Image
              src="/logos/amarel.png"
              alt="Amarel"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            FormCraft
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "#f97316" }}>
            by Amarel
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
