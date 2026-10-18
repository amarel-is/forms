"use client"

import { useMemo, useState } from "react"
import { Filter, Download, Eye, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ShareViewResult } from "@/lib/share-links"

type OkView = Extract<ShareViewResult, { status: "ok" }>

function escapeCSV(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-")
  return `${Number(day)}.${Number(m)}.${y}`
}

function Cell({ value }: { value: string }) {
  if (!value) return <span className="text-neutral-300">—</span>
  if (value.startsWith("data:image/") || /^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(value)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" className="h-10 max-w-[120px] rounded-md border border-neutral-200 object-contain bg-white" />
  }
  if (/^https?:\/\/\S+$/.test(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-orange-600 underline underline-offset-2">
        קישור
      </a>
    )
  }
  return <span className="whitespace-pre-line">{value}</span>
}

export function ShareResultsView({ view }: { view: OkView }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return view.rows
    return view.rows.filter((r) => view.columns.some((c) => r[c.id]?.includes(q)))
  }, [query, view])

  function download() {
    const headers = view.columns.map((c) => c.label)
    const lines = [
      headers.map(escapeCSV).join(","),
      ...view.rows.map((r) => view.columns.map((c) => escapeCSV(r[c.id] ?? "")).join(",")),
    ]
    // UTF-8 BOM so Excel opens the Hebrew correctly
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const safeName = view.name.replace(/[^\w֐-׿\s-]/g, "").trim() || "results"
    const a = document.createElement("a")
    a.href = url
    a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-neutral-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-neutral-500 mb-1">{view.formName}</p>
            <h1 className="text-xl font-bold text-neutral-900">{view.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
              {view.filterLabel && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1">
                  <Filter className="h-3 w-3" />
                  {view.filterLabel}: {view.filterValues.join(" / ")}
                </span>
              )}
              <span className="text-neutral-500">{view.rows.length} הגשות · מתעדכן אוטומטית</span>
            </div>
          </div>
          {view.allowDownload ? (
            view.rows.length > 0 && (
              <Button
                onClick={download}
                className="h-9 rounded-xl gap-1.5 text-sm bg-orange-600 hover:bg-orange-500 text-white"
              >
                <Download className="h-4 w-4" />
                הורדה לאקסל
              </Button>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 rounded-lg bg-neutral-100 px-2.5 py-1.5">
              <Eye className="h-3.5 w-3.5" />
              צפייה בלבד
            </span>
          )}
        </div>
      </div>

      {view.rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500">אין עדיין הגשות שתואמות לסינון</div>
      ) : (
        <>
          <div className="p-3 sm:p-4 border-b border-neutral-100">
            <div className="relative max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש ברשימה"
                className="w-full h-9 rounded-xl border border-neutral-200 pr-8 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5 text-right font-medium w-10">#</th>
                  {view.columns.map((c) => (
                    <th key={c.id} className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 text-neutral-400">{i + 1}</td>
                    {view.columns.map((c) => (
                      <td key={c.id} className="px-4 py-2.5 whitespace-nowrap">
                        <Cell value={r[c.id] ?? ""} />
                      </td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={view.columns.length + 1} className="px-4 py-8 text-center text-neutral-500">
                      לא נמצאו תוצאות לחיפוש
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view.expiresAt && (
        <div className="px-5 py-3 text-[11px] text-neutral-400 border-t border-neutral-100">
          הקישור בתוקף עד {formatDate(view.expiresAt)}
        </div>
      )}
    </div>
  )
}
