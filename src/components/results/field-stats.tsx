import type { FieldConfig, FormResponse } from "@/lib/types"

interface FieldStatsProps {
  fields: FieldConfig[]
  responses: FormResponse[]
}

export function FieldStats({ fields, responses }: FieldStatsProps) {
  if (fields.length === 0 || responses.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((field) => (
        <FieldStatCard key={field.id} field={field} responses={responses} />
      ))}
    </div>
  )
}

function FieldStatCard({ field, responses }: { field: FieldConfig; responses: FormResponse[] }) {
  const total = responses.length

  if (field.type === "text") {
    const answered = responses.filter((r) => {
      const val = r.data[field.id]
      return val && (val as string).trim().length > 0
    }).length
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0

    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-3">
          {field.label || "ללא שם"}
        </p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-bold text-neutral-900">{answered}</span>
          <span className="text-sm text-neutral-400 mb-1">/ {total} ענו</span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-neutral-900 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-neutral-400 mt-1.5">שיעור תגובה {pct}%</p>
      </div>
    )
  }

  if (field.type === "dropdown" || field.type === "multiselect") {
    const countMap: Record<string, number> = {}

    responses.forEach((r) => {
      const val = r.data[field.id]
      if (!val) return
      if (Array.isArray(val)) {
        val.forEach((v) => { countMap[v] = (countMap[v] ?? 0) + 1 })
      } else {
        if (val) countMap[val] = (countMap[val] ?? 0) + 1
      }
    })

    const options = field.options ?? []
    const maxCount = Math.max(...Object.values(countMap), 1)

    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-4">
          {field.label || "ללא שם"}
        </p>
        <div className="space-y-3">
          {options.map((opt) => {
            const count = countMap[opt] ?? 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            const barPct = Math.round((count / maxCount) * 100)

            return (
              <div key={opt}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-neutral-700 truncate max-w-[70%]">{opt}</span>
                  <span className="text-xs text-neutral-400 shrink-0 me-2">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-800 rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {options.length === 0 && (
            <p className="text-xs text-neutral-400">לא הוגדרו אפשרויות</p>
          )}
        </div>
      </div>
    )
  }

  return null
}
