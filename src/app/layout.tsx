import type { Metadata } from "next"
import { Google_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import "./globals.css"

const googleSans = Google_Sans({
  subsets: ["latin", "hebrew"],
  weight: "variable",
  variable: "--font-google-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://forms.amarel.net"
  ),
  title: {
    default: "מערכת סקרים - אמרל",
    template: "%s | מערכת סקרים - אמרל",
  },
  description:
    "מערכת ניהול טפסים וסקרים של אמרל — בניה קלה, פרסום מיידי ומעקב תגובות בזמן אמת",
  keywords: ["טפסים", "סקרים", "אמרל", "דיווח נוכחות", "forms", "amarel"],
  authors: [{ name: "Amarel" }],
  creator: "Amarel",
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "מערכת סקרים - אמרל",
    title: "מערכת סקרים - אמרל",
    description: "מערכת ניהול טפסים וסקרים של אמרל",
    images: [{ url: "/logos/amarel.png", width: 512, height: 512, alt: "Amarel" }],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      { rel: "android-chrome-192", url: "/android-chrome-192x192.png", sizes: "192x192" },
      { rel: "android-chrome-512", url: "/android-chrome-512x512.png", sizes: "512x512" },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${googleSans.variable} min-h-screen antialiased`}>
        {/* Skip link for keyboard/screen reader users (WCAG 2.4.1, IS 5568) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-[100] focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
        >
          דלג לתוכן הראשי
        </a>
        <ImpersonationBanner />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
