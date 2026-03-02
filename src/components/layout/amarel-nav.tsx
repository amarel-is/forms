import Link from "next/link"
import { Plus, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { SignOutButton } from "./sign-out-button"

// Nav color constants — use directly in className to avoid CSS-variable issues with Tailwind v4
const NAV_BG = "bg-[#2D4458]"
const NAV_BORDER = "border-[rgba(148,163,184,0.15)]"

// ─── Brand wordmark ──────────────────────────────────────────────────────────

export function AmarelLogo({ size = "default" }: { size?: "default" | "sm" }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-1 shrink-0 leading-none">
      <span className={`font-bold text-white ${size === "sm" ? "text-xs" : "text-sm"}`}>
        אמרל
      </span>
      <span className={`text-white/40 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
        |
      </span>
      <span
        className={`font-normal text-white/60 ${size === "sm" ? "text-[10px]" : "text-xs"}`}
      >
        טפסים
      </span>
    </Link>
  )
}

// ─── Nav link ────────────────────────────────────────────────────────────────

function NavLink({
  href,
  children,
  active,
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-white/15 text-white"
          : "text-white/65 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  )
}

// ─── Full app header ─────────────────────────────────────────────────────────

interface AppHeaderProps {
  userId: string
  userEmail?: string
  activePath?: "dashboard" | "forms" | "new"
}

export function AppHeader({ userId, userEmail, activePath }: AppHeaderProps) {
  return (
    <header className={`sticky top-0 z-20 border-b ${NAV_BG} ${NAV_BORDER}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <AmarelLogo />

        {/* Divider */}
        <div className="w-px h-5 bg-white/15 hidden sm:block shrink-0" />

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          <NavLink href="/dashboard" active={activePath === "dashboard"}>
            <LayoutGrid className="h-3.5 w-3.5" />
            הטפסים שלי
          </NavLink>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* New form CTA — orange */}
          <Button
            asChild
            size="sm"
            className="h-8 rounded-xl gap-1.5 text-xs bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-sm hidden sm:flex"
          >
            <Link href="/forms/new">
              <Plus className="h-3.5 w-3.5" />
              טופס חדש
            </Link>
          </Button>

          {/* Notification bell */}
          <NotificationBell userId={userId} />

          {/* Email */}
          {userEmail && (
            <span className="text-xs text-white/40 hidden md:block" dir="ltr">
              {userEmail}
            </span>
          )}

          {/* Sign out */}
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}

// ─── Thin nav bar for the form builder ───────────────────────────────────────

export function AmarelNavBar({ children }: { children: React.ReactNode }) {
  return (
    <header className={`sticky top-0 z-10 border-b ${NAV_BG} ${NAV_BORDER}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {children}
      </div>
    </header>
  )
}
