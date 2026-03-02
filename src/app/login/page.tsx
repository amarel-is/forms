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
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white"
            >
              <rect x="3" y="3" width="18" height="4" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="3" y="10" width="12" height="4" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="3" y="17" width="8" height="4" rx="1" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            FormCraft
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            בנה טפסים יפים תוך דקות
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
