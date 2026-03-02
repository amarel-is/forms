import Image from "next/image"
import Link from "next/link"

/** Amarel wordmark + logo, links to /dashboard */
export function AmarelLogo({ size = "default" }: { size?: "default" | "sm" }) {
  const imgSize = size === "sm" ? 22 : 28
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
      <Image
        src="/logos/amarel.png"
        alt="Amarel"
        width={imgSize}
        height={imgSize}
        className="rounded-md object-contain"
        priority
      />
      <span
        className={`font-semibold text-white ${size === "sm" ? "text-xs" : "text-sm"}`}
      >
        FormCraft
      </span>
    </Link>
  )
}

/** The standard Amarel-branded sticky nav bar */
export function AmarelNavBar({ children }: { children: React.ReactNode }) {
  return (
    <header
      className="sticky top-0 z-10 border-b"
      style={{
        backgroundColor: "var(--amarel-nav)",
        borderBottomColor: "var(--amarel-nav-border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {children}
      </div>
    </header>
  )
}
