import type { AnswerValue, FieldConfig } from "@/lib/types"
import { repeaterItems, scalarText } from "@/lib/answer-format"

/** Mini table of a repeater answer: one row per item, one column per sub-field. */
export function RepeaterTable({ field, value }: { field: FieldConfig; value: AnswerValue | undefined }) {
  const items = repeaterItems(value)
  const subFields = field.sub_fields ?? []
  const noun = field.item_label?.trim() || "פריט"
  if (items.length === 0) return <span className="text-neutral-300">—</span>

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-sm" dir="rtl">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-right font-medium">#</th>
            {subFields.map((sf) => (
              <th key={sf.id} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                {sf.label || "שדה"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-t border-neutral-100">
              <td className="px-3 py-2 text-neutral-400 whitespace-nowrap">{noun} {i + 1}</td>
              {subFields.map((sf) => {
                const v = item[sf.id]
                const text = sf.type === "checkbox" ? (v === "true" ? "✓" : "") : scalarText(v)
                return (
                  <td key={sf.id} className="px-3 py-2 text-neutral-700">
                    {text || <span className="text-neutral-300">—</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
