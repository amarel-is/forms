"use client"

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

export function ParagraphElement({ field }: LayoutElementProps) {
  const text = field.content ?? field.label
  if (!text) return null
  return (
    <p className="text-base text-neutral-600 leading-relaxed whitespace-pre-wrap">
      {text}
    </p>
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

export function ImageElement({ field }: LayoutElementProps) {
  const src = field.content ?? field.placeholder ?? ""
  if (!src) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={field.label || ""}
        className="w-full max-h-64 sm:max-h-80 object-cover"
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
