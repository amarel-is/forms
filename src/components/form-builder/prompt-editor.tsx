"use client"

import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  fields?: { id: string; display: string }[]
  placeholder?: string
  dir?: "rtl" | "ltr"
  className?: string
}

const TAG_RE = /({{[^}]*}})/g

function Highlighted({ text }: { text: string }) {
  const parts = text.split(TAG_RE)
  return (
    <>
      {parts.map((part, i) =>
        TAG_RE.test(part) ? (
          <mark
            key={i}
            style={{
              background: "rgba(59,130,246,0.15)",
              color: "#2563eb",
              borderRadius: 4,
              fontWeight: 500,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// shared style must be identical between backdrop and textarea
const SHARED: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 14,
  lineHeight: "1.6",
  fontFamily: "inherit",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "break-word",
  tabSize: 2,
}

export function PromptEditor({
  value,
  onChange,
  placeholder,
  dir = "rtl",
  className,
}: PromptEditorProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const syncScroll = useCallback(() => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  return (
    <div
      className={cn(
        "relative rounded-xl border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring overflow-hidden",
        className
      )}
      style={{ minHeight: 120 }}
    >
      {/* backdrop — absolutely positioned, same exact layout as textarea */}
      <div
        ref={backdropRef}
        aria-hidden
        dir={dir}
        style={{
          ...SHARED,
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          userSelect: "none",
          color: "hsl(var(--foreground))",
        }}
      >
        <Highlighted text={value} />
        {/* keeps last-line height when value ends with newline */}
        &#8203;
      </div>

      {/* actual textarea — transparent text so backdrop shows through */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        dir={dir}
        rows={5}
        style={{
          ...SHARED,
          position: "relative",
          display: "block",
          width: "100%",
          minHeight: 120,
          background: "transparent",
          color: "transparent",
          caretColor: "hsl(var(--foreground))",
          resize: "none",
          border: "none",
          outline: "none",
        }}
        className="placeholder:text-muted-foreground"
      />
    </div>
  )
}
