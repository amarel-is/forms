"use client"

import { ExternalLink, Layers } from "lucide-react"
import type { FieldConfig } from "@/lib/types"

interface LayoutElementProps {
  field: FieldConfig
}

export function HeadingElement({ field }: LayoutElementProps) {
  if (!field.label) return null
  return (
    <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
      {field.label}
    </h1>
  )
}

export function SubheadingElement({ field }: LayoutElementProps) {
  if (!field.label) return null
  return (
    <h2 className="text-lg font-semibold text-neutral-800 leading-snug">
      {field.label}
    </h2>
  )
}

const PARAGRAPH_STYLES: Record<string, { wrapper: string; text: string }> = {
  default: { wrapper: "", text: "text-neutral-600" },
  info:    { wrapper: "rounded-xl border border-blue-200 bg-blue-50 px-4 py-3", text: "text-blue-800" },
  success: { wrapper: "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3", text: "text-emerald-800" },
  warning: { wrapper: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3", text: "text-amber-800" },
  danger:  { wrapper: "rounded-xl border border-red-200 bg-red-50 px-4 py-3", text: "text-red-800" },
}

export function ParagraphElement({ field }: LayoutElementProps) {
  const content = field.content ?? field.label
  if (!content) return null

  const style = PARAGRAPH_STYLES[field.paragraph_style ?? "default"] ?? PARAGRAPH_STYLES.default
  const isHtml = content.trimStart().startsWith("<")

  if (isHtml) {
    return (
      <div className={style.wrapper}>
        <div
          className={`rich-text text-base leading-relaxed ${style.text}`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized TipTap HTML output
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    )
  }

  return (
    <div className={style.wrapper}>
      <p className={`text-base leading-relaxed whitespace-pre-wrap ${style.text}`}>
        {content}
      </p>
    </div>
  )
}

export function DividerElement({ field }: LayoutElementProps) {
  if (field.label) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs text-neutral-400 font-medium shrink-0">
          {field.label}
        </span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
    )
  }
  return <div className="h-px bg-neutral-200 my-1" />
}

export function LinkElement({ field }: LayoutElementProps) {
  const href = field.content ?? ""
  if (!href) return null
  return (
    <div className="flex justify-center">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 hover:border-blue-300 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-4 w-4 shrink-0" />
        <span>{field.label || href}</span>
      </a>
      {field.placeholder && (
        <p className="text-xs text-neutral-400 text-center mt-1.5">{field.placeholder}</p>
      )}
    </div>
  )
}

export function ImageElement({ field }: LayoutElementProps) {
  const src = field.content ?? field.placeholder ?? ""
  if (!src) return null

  // "contain" shows the full image without cropping; "cover" (default) crops to width.
  const fullAspect = field.image_fit === "contain"

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={field.label || ""}
        className={
          fullAspect
            ? "w-full h-auto"
            : "w-full max-h-64 sm:max-h-80 object-cover"
        }
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement
          el.style.display = "none"
          const parent = el.parentElement
          if (parent) {
            parent.innerHTML = `<div class="flex items-center justify-center py-8 text-neutral-300 text-sm">לא ניתן לטעון את התמונה</div>`
          }
        }}
      />
      {field.label && (
        <p className="text-xs text-neutral-400 text-center py-2 px-4">{field.label}</p>
      )}
    </div>
  )
}

export function SectionElement({ field }: LayoutElementProps) {
  if (!field.label) return null
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <Layers className="h-4 w-4 text-violet-500 shrink-0" />
      <h3 className="text-base font-bold text-neutral-800">{field.label}</h3>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  )
}
