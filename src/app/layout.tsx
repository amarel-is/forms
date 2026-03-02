import type { Metadata } from "next"
import { Google_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
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
    default: "אמרל טפסים",
    template: "%s | אמרל טפסים",
  },
  description:
    "מערכת ניהול טפסים ומשאלות של אמרל — בניה קלה, פרסום מיידי ומעקב תגובות בזמן אמת",
  keywords: ["טפסים", "משאלות", "אמרל", "דיווח נוכחות", "forms", "amarel"],
  authors: [{ name: "Amarel" }],
  creator: "Amarel",
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "אמרל טפסים",
    title: "אמרל טפסים",
    description: "מערכת ניהול טפסים ומשאלות של אמרל",
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
        {children}
        <Toaster />
      </body>
    </html>
  )
}
