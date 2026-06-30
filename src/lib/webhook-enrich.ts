import {
  isLayoutField,
  type FieldConfig,
  type FormDataset,
  type FormSchema,
  type FormSettings,
} from "@/lib/types"

// ─── Webhook payload enrichment ────────────────────────────────────────────────
// The raw `response_data` is keyed by field ID, and dataset-backed selections
// store only the chosen label. This helper produces two extra, human-readable
// objects so external consumers (e.g. Make.com → email) get everything they
// need without doing their own field-ID or dataset lookups:
//   • answers  — every answered field, keyed by its (Hebrew) label
//   • resolved — per thank-you recap block: the dataset row columns (incl. links),
//                keyed by column name. Block id is the key (e.g. recap_isuf_link).

function normalize(s: string): string {
  return String(s ?? "").trim()
}

/** Match a selected option value against a dataset row, tolerating the
 *  "⭐ " prefix on options and stray whitespace on dataset cells. */
function rowMatchesSelection(
  ds: FormDataset,
  selection: string,
  labelColumnId?: string
): FormDataset["rows"][number] | undefined {
  const sel = normalize(selection)
  if (!sel) return undefined
  return ds.rows.find((r) => {
    const cols = labelColumnId ? [labelColumnId] : ds.columns.map((c) => c.id)
    return cols.some((cid) => {
      const cell = normalize(String(r[cid] ?? ""))
      return !!cell && (cell === sel || sel.includes(cell))
    })
  })
}

export function buildWebhookEnrichment(
  form: { fields?: FieldConfig[]; settings?: FormSettings; schema?: FormSchema },
  responseData: Record<string, string | string[]>
): {
  answers: Record<string, string>
  resolved: Record<string, Record<string, string>>
} {
  const fields = form.fields ?? []
  const datasets = form.schema?.datasets ?? []
  const recaps = form.settings?.thank_you_recaps ?? []

  // 1. answers — by field label
  const answers: Record<string, string> = {}
  for (const f of fields) {
    if (isLayoutField(f.type) || !f.label) continue
    const raw = responseData[f.id]
    if (raw === undefined || raw === null) continue
    answers[f.label] = Array.isArray(raw) ? raw.join(", ") : String(raw)
  }

  // 2. resolved — dataset rows behind each recap block (links etc.)
  const resolved: Record<string, Record<string, string>> = {}
  for (const block of recaps) {
    const field = fields.find((f) => f.id === block.source_field_id)
    const dsId = field?.data_source?.dataset_id ?? block.dataset_id
    const ds = datasets.find((d) => d.id === dsId)
    if (!field || !ds) continue

    const raw = responseData[block.source_field_id]
    const selection = Array.isArray(raw) ? raw[0] : raw
    if (!selection) continue

    const row = rowMatchesSelection(ds, String(selection), field.data_source?.label_column)
    if (!row) continue

    const out: Record<string, string> = {}
    for (const col of ds.columns) {
      out[col.name] = normalize(String(row[col.id] ?? ""))
    }

    // Exact secondary stop: a conditional field gated on this same primary
    // selection field (e.g. "תחנת עלייה מדויקת — …"). Its id varies per
    // primary point, so expose the chosen value under a stable `station` key.
    const stationField = fields.find(
      (f) =>
        f.id !== block.source_field_id &&
        (f.conditions?.rules ?? []).some((r) => r.fieldId === block.source_field_id) &&
        responseData[f.id] !== undefined &&
        responseData[f.id] !== "" &&
        !Array.isArray(responseData[f.id])
    )
    if (stationField) {
      out.station = normalize(String(responseData[stationField.id]))
    }

    resolved[block.id] = out
  }

  return { answers, resolved }
}
