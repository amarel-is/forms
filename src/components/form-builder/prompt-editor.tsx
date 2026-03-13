"use client"

import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  dir?: "rtl" | "ltr"
}

function renderHighlighted(text: string) {
  const parts = text.split(/({{[^}]*}})/g)
  return parts.map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return (
        <mark
          key={i}
          style={{
            background: "rgba(59,130,246,0.12)",
            color: "#2563eb",
            borderRadius: "4px",
            padding: "0 2px",
            fontWeight: 500,
          }}
        >
          {part}
        </mark>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function PromptEditor({
  value,
  onChange,
  placeholder,
  className,
  dir = "rtl",
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const syncScroll = useCallback(() => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  return (
    <div
      className={cn(
        "relative rounded-xl border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring",
        className
      )}
      style={{ minHeight: 120 }}
    >
      {/* highlighted backdrop — renders colored text below the transparent textarea */}
      <div
        ref={backdropRef}
        aria-hidden
        dir={dir}
        className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none select-none"
        style={{
          padding: "8px 12px",
          fontSize: 14,
          lineHeight: "1.6",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "inherit",
          color: "hsl(var(--foreground))",
        }}
      >
        {renderHighlighted(value || "")}
        {"\u200b"}
      </div>

      {/* real textarea — text is invisible so backdrop shows through */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        dir={dir}
        rows={5}
        className="relative w-full rounded-xl bg-transparent resize-none outline-none p-[8px_12px] text-sm leading-[1.6] placeholder:text-muted-foreground"
        style={{
          color: "transparent",
          caretColor: "hsl(var(--foreground))",
          fontFamily: "inherit",
          minHeight: 120,
        }}
      />
    </div>
  )
}
