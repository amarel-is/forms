"use client"

import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      dir="rtl"
      position="top-center"
      gap={8}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast: [
            "group flex items-center gap-3 w-full min-w-[280px] max-w-sm",
            "rounded-xl border border-neutral-200/80 bg-white",
            "px-4 py-3 shadow-lg shadow-neutral-900/8",
            "text-sm font-medium text-neutral-800",
            "data-[type=success]:border-green-200 data-[type=success]:bg-green-50",
            "data-[type=error]:border-red-200 data-[type=error]:bg-red-50",
            "data-[type=warning]:border-amber-200 data-[type=warning]:bg-amber-50",
            "data-[type=info]:border-blue-200 data-[type=info]:bg-blue-50",
          ].join(" "),
          content: "flex-1 min-w-0",
          title: "text-sm font-semibold leading-snug text-right",
          description: "text-xs text-neutral-500 mt-0.5 text-right",
          icon: "shrink-0",
          actionButton:
            "text-xs font-semibold bg-neutral-900 text-white rounded-lg px-3 py-1.5 hover:bg-neutral-700 transition-colors",
          cancelButton:
            "text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors",
        },
      }}
      icons={{
        success: <CheckCircle2 className="size-4 text-green-600 shrink-0" />,
        error: <XCircle className="size-4 text-red-600 shrink-0" />,
        warning: <AlertTriangle className="size-4 text-amber-500 shrink-0" />,
        info: <Info className="size-4 text-blue-500 shrink-0" />,
        loading: <Loader2 className="size-4 text-neutral-500 animate-spin shrink-0" />,
      }}
      style={
        {
          "--width": "360px",
          fontFamily: "var(--font-google-sans, system-ui)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
