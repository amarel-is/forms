"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { FormStat } from "@/lib/analytics"

interface Props {
  data: FormStat[]
}

export function FormsLeaderboard({ data }: Props) {
  const display = data.slice(0, 10)

  if (display.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-neutral-400 text-sm">
        אין נתונים
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {display.map((entry, index) => (
        <Link
          key={entry.id}
          href={`/forms/${entry.id}/results`}
          className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-neutral-50 transition-colors group"
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold tabular-nums"
            style={{
              backgroundColor: entry.form_type === "attendance" ? "#fff7ed" : "#eff6ff",
              color: entry.form_type === "attendance" ? "#c2410c" : "#1d4ed8",
            }}
          >
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-800 truncate group-hover:text-neutral-900">
              {entry.name}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {entry.today > 0 ? `${entry.today} היום · ` : ""}
              {entry.total} סה״כ
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-sm font-semibold tabular-nums"
              style={{
                color: entry.form_type === "attendance" ? "#ea580c" : "#2563eb",
              }}
            >
              {entry.total}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
          </div>
        </Link>
      ))}
      <p className="text-xs text-neutral-400 mt-3 pt-2 border-t border-neutral-100">
        כחול = כללי • כתום = נוכחות
      </p>
    </div>
  )
}
