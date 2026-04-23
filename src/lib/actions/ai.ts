"use server"

import { nanoid } from "nanoid"
import { z } from "zod"
import OpenAI from "openai"
import { zodResponseFormat, zodFunction } from "openai/helpers/zod"
import { createForm } from "./forms"
import type {
  FieldConfig,
  FieldCondition,
  FormSettings,
  FormSchema,
  FormDataset,
  DatasetRow,
  ApprovalWorkflow,
  FormType,
} from "@/lib/types"

// בחירת מודלים:
// - gpt-5.4: יצירת טופס + עריכת טופס (reasoning חזק)
// - gpt-5-nano: חישוב שדה AI (קצר, זול, מהיר)
const FORM_MODEL = "gpt-5.4"
const EDITOR_MODEL = "gpt-5.4"
const COMPUTE_MODEL = "gpt-5-nano"

// ─── Shared AI schemas (nullable, flat-ish for OpenAI structured output) ────

const FIELD_TYPES = [
  // Input fields
  "text",
  "long_answer",
  "dropdown",
  "multiselect",
  "radio",
  "checkbox",
  "number",
  "date",
  "star_rating",
  "entry_exit",
  "location",
  "signature",
  // Layout / display fields
  "heading",
  "subheading",
  "paragraph",
  "divider",
  "image",
  "link",
  "section",
  "dataset_lookup",
  "ai_computed",
] as const

const OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
  "greater_than",
  "less_than",
] as const

const VALIDATION_TYPES = [
  "none",
  "numbers_only",
  "text_only",
  "phone_il",
  "id_il",
  "custom_regex",
] as const

const AIConditionRuleSchema = z.object({
  field_key: z.string(),
  operator: z.enum(OPERATORS),
  value: z.string().nullable(),
  dataset_column_key: z.string().nullable(),
})

const AIConditionsSchema = z.object({
  match: z.enum(["all", "any"]),
  rules: z.array(AIConditionRuleSchema),
})

const AIFieldSchema = z.object({
  key: z.string().describe("stable lowercase_snake_case English key for references"),
  type: z.enum(FIELD_TYPES),
  label: z.string(),
  required: z.boolean(),
  placeholder: z.string().nullable(),
  content: z.string().nullable().describe("paragraph body, image URL, or link URL"),
  options: z.array(z.string()).nullable(),
  allow_other: z.boolean().nullable(),
  paragraph_style: z
    .enum(["default", "info", "success", "warning", "danger"])
    .nullable(),
  validation_type: z.enum(VALIDATION_TYPES).nullable(),
  validation_pattern: z.string().nullable().describe("regex when validation_type=custom_regex"),
  min: z.number().nullable(),
  max: z.number().nullable(),
  step: z.number().nullable(),
  date_mode: z.enum(["date", "datetime"]).nullable(),
  default_value_now: z.boolean().nullable(),
  default_value: z.string().nullable(),
  data_source_dataset_key: z.string().nullable(),
  data_source_label_column_key: z.string().nullable(),
  data_source_value_column_key: z.string().nullable(),
  lookup_field_key: z.string().nullable(),
  lookup_dataset_key: z.string().nullable(),
  lookup_column_key: z.string().nullable(),
  prompt_template: z.string().nullable(),
  ai_model: z.string().nullable(),
  attendance_role: z
    .enum(["id_number", "name", "division", "direction"])
    .nullable(),
  show_to_approver: z.boolean().nullable(),
  conditions: AIConditionsSchema.nullable(),
})

type AIField = z.infer<typeof AIFieldSchema>

const AIDatasetColumnSchema = z.object({
  key: z.string(),
  name: z.string(),
  type: z.enum(["text", "number"]),
})

const AIDatasetRowSchema = z.object({
  cells: z.array(z.object({ column_key: z.string(), value: z.string() })),
})

const AIDatasetSchema = z.object({
  key: z.string(),
  name: z.string(),
  columns: z.array(AIDatasetColumnSchema),
  rows: z.array(AIDatasetRowSchema),
})

type AIDataset = z.infer<typeof AIDatasetSchema>

const AIApprovalStepSchema = z.object({
  approver_name: z.string(),
  channel: z.enum(["email", "whatsapp"]),
  source_type: z.enum(["fixed", "from_field", "from_option_map"]),
  target: z.string().nullable(),
  source_field_key: z.string().nullable(),
  target_by_value: z
    .array(z.object({ option: z.string(), target: z.string() }))
    .nullable(),
})

const AIApprovalWorkflowSchema = z.object({
  enabled: z.boolean(),
  steps: z.array(AIApprovalStepSchema),
})

const AIApprovalVisibilitySchema = z.object({
  mode: z.enum(["all", "selected"]),
  visible_field_keys: z.array(z.string()).nullable(),
})

const FormGenerationSchema = z.object({
  name: z.string(),
  description: z.string(),
  form_type: z.enum(["general", "attendance", "approval"]),
  submit_label: z.string().nullable(),
  submit_message: z.string().nullable(),
  after_submit: z.enum(["thank_you", "redirect"]).nullable(),
  redirect_url: z.string().nullable(),
  hide_branding: z.boolean().nullable(),
  submission_limit_field_key: z.string().nullable(),
  submission_limit_count: z.number().nullable(),
  submission_limit_error_message: z.string().nullable(),
  submission_start_date: z.string().nullable().describe("YYYY-MM-DD, Israel timezone"),
  submission_end_date: z.string().nullable(),
  datasets: z.array(AIDatasetSchema).nullable(),
  fields: z.array(AIFieldSchema),
  approval_workflow: AIApprovalWorkflowSchema.nullable(),
  approval_field_visibility: AIApprovalVisibilitySchema.nullable(),
})

// ─── System prompt with full capabilities ──────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Hebrew form builder for Israeli organizations. You have the full feature set of a professional form platform at your disposal.

OUTPUT RULES
- All user-visible text (labels, placeholders, paragraph content, options, approval names, messages) MUST be in Hebrew.
- Every field and dataset and column needs a stable lowercase_snake_case English "key" used for internal references. Conditions, lookups, approval steps, submission limits, and visibility lists all reference fields/datasets by key.
- For every nullable field you are not using, set it to null (do not omit).

FIELD TYPES
Input fields:
- text: short text answer
- long_answer: multi-line paragraph answer
- dropdown / radio: single-choice from options[]
- multiselect: multiple choice from options[]
- checkbox: single yes/no
- number: numeric input (use min/max/step)
- date: date picker (set date_mode "date" or "datetime")
- star_rating: 1-5 stars
- entry_exit: כניסה/יציאה toggle (attendance)
- location: GPS capture
- signature: signature canvas
- dataset_lookup: display-only field auto-filled from a dataset row when a dataset-bound field is selected; set lookup_field_key (the source dropdown), lookup_dataset_key, lookup_column_key
- ai_computed: display-only field whose value comes from an AI prompt with {{field label}} placeholders; set prompt_template and optionally ai_model

Layout / display fields (no answer collected):
- heading, subheading: titles / sub-titles
- paragraph: styled paragraph (put the body in content, choose paragraph_style from default/info/success/warning/danger)
- divider: horizontal separator
- image: put image URL in content; label is alt text
- link: put URL in content; label is the clickable text
- section: opens a visual group — all following fields belong to this section until the next section field. Use sections liberally for organizing long forms into clear areas.

CONDITIONAL VISIBILITY
Any field may carry a conditions object:
{ "match": "all" | "any", "rules": [{ "field_key": "...", "operator": "...", "value": "...", "dataset_column_key": null }] }
Operators: equals, not_equals, contains, not_contains, is_empty, is_not_empty, greater_than, less_than.
- Leave value null for is_empty / is_not_empty.
- greater_than / less_than compare numerically for number fields and lexicographically otherwise.
- "all" = AND between rules, "any" = OR. Prefer explicit "all" when a field has only one rule.

VALIDATION (text fields)
validation_type: none | numbers_only | text_only | phone_il | id_il | custom_regex
If custom_regex, also set validation_pattern (JS regex without leading/trailing slashes).

NUMBER CONSTRAINTS
Use min, max, step for number fields (e.g., rating 0-100, integer step 1).

DEFAULT VALUES
- default_value_now=true for date fields to pre-fill the current time/date.
- default_value for simple string defaults.

DATASETS (mini-databases)
If the form benefits from a shared lookup table (employees, departments, products, cities), include it in datasets:
- Give each dataset a key and Hebrew display name.
- Columns: each with key, name (Hebrew), type (text | number).
- Rows: array of { cells: [{ column_key, value }] } — all cell values are strings, coerce later.
- Keep each dataset under ~40 rows; for longer lists, create a smaller representative sample and suggest CSV import in the form description.
Bind an input field to a dataset by setting data_source_dataset_key + data_source_label_column_key + data_source_value_column_key on a dropdown / multiselect / radio. Users pick by label, the stored value is from the value column.
For cascading lookups (e.g., pick employee → auto-fill department), add a dataset_lookup field that references the dataset-bound source field via lookup_field_key and pulls a specific column via lookup_column_key.

FORM TYPES
- "general": standard
- "attendance": entry/exit tracking — include fields with attendance_role (name, id_number, division, direction)
- "approval": multi-step approval workflow — set approval_workflow

APPROVAL WORKFLOW (only when form_type="approval")
approval_workflow: {
  enabled: true,
  steps: [
    { approver_name: "מנהל כספים", channel: "email"|"whatsapp", source_type: "fixed", target: "cfo@company.com", source_field_key: null, target_by_value: null },
    { approver_name: "ממונה ישיר", channel: "email", source_type: "from_field", source_field_key: "manager_email_field", target: null, target_by_value: null },
    { approver_name: "מנהל מחלקה", channel: "email", source_type: "from_option_map", source_field_key: "department_dropdown", target: null, target_by_value: [{ option: "כספים", target: "cfo@..." }, { option: "תפעול", target: "ops@..." }] }
  ]
}
approval_field_visibility: which form fields the approver sees. mode "all" or "selected" (then list visible_field_keys). Use show_to_approver=false on any input field you want hidden from approvers in "all" mode.

SUBMISSION CONTROLS
- submission_limit_field_key + submission_limit_count + submission_limit_error_message: cap submissions per unique value (e.g., 1 per ת.ז.).
- submission_start_date / submission_end_date: YYYY-MM-DD bounds (Israel timezone).
- hide_branding: true to hide the Amarel powered-by footer.
- after_submit="redirect" + redirect_url: external redirect after submit, otherwise "thank_you".

DESIGN GUIDELINES
- Long forms → break with section + subheading + paragraph (info) for instructions.
- Put a welcoming paragraph at the top if the form is public-facing.
- Pick required=true only for truly needed fields.
- Hebrew submit_label (e.g., "שלח טופס", "שלח דיווח").
`

// ─── Key-mapping helpers ───────────────────────────────────────────────────

interface KeyMaps {
  fieldKeyToId: Map<string, string>
  datasetKeyToId: Map<string, string>
  datasetColumnKeyToId: Map<string, Map<string, string>>
}

function emptyMaps(): KeyMaps {
  return {
    fieldKeyToId: new Map(),
    datasetKeyToId: new Map(),
    datasetColumnKeyToId: new Map(),
  }
}

function buildDatasets(aiDatasets: AIDataset[] | null | undefined, maps: KeyMaps): FormDataset[] {
  if (!aiDatasets || aiDatasets.length === 0) return []

  const datasets: FormDataset[] = []
  for (const ds of aiDatasets) {
    const dsId = nanoid()
    maps.datasetKeyToId.set(ds.key, dsId)

    const colMap = new Map<string, string>()
    const columns = ds.columns.map((c) => {
      const colId = nanoid()
      colMap.set(c.key, colId)
      return { id: colId, name: c.name, type: c.type }
    })
    maps.datasetColumnKeyToId.set(ds.key, colMap)

    const rows: DatasetRow[] = ds.rows.map((r) => {
      const row: DatasetRow = { id: nanoid() }
      for (const cell of r.cells) {
        const colId = colMap.get(cell.column_key)
        if (!colId) continue
        const col = columns.find((x) => x.id === colId)
        if (col?.type === "number") {
          const n = Number(cell.value)
          row[colId] = Number.isFinite(n) ? n : 0
        } else {
          row[colId] = cell.value
        }
      }
      return row
    })

    datasets.push({ id: dsId, name: ds.name, columns, rows })
  }
  return datasets
}

function buildFieldConfig(af: AIField, maps: KeyMaps, allAiFields: AIField[]): FieldConfig {
  const id = maps.fieldKeyToId.get(af.key) ?? nanoid()
  maps.fieldKeyToId.set(af.key, id)

  const config: FieldConfig = {
    id,
    type: af.type,
    label: af.label,
    required: af.required,
  }

  if (af.placeholder) config.placeholder = af.placeholder
  if (af.options && af.options.length > 0) config.options = af.options
  if (af.allow_other) config.allow_other = true
  if (af.paragraph_style && af.paragraph_style !== "default") {
    config.paragraph_style = af.paragraph_style
  }

  if (af.validation_type && af.validation_type !== "none") {
    config.validation = {
      type: af.validation_type,
      ...(af.validation_type === "custom_regex" && af.validation_pattern
        ? { custom_pattern: af.validation_pattern }
        : {}),
    }
  }

  if (typeof af.min === "number") config.min = af.min
  if (typeof af.max === "number") config.max = af.max
  if (typeof af.step === "number") config.step = af.step
  if (af.date_mode) config.date_mode = af.date_mode
  if (af.default_value_now) config.default_value = "__now__"
  else if (af.default_value) config.default_value = af.default_value

  // content for paragraph / image / link
  if (af.type === "paragraph" || af.type === "image" || af.type === "link") {
    if (af.content) config.content = af.content
    else if (af.type === "paragraph") config.content = af.label
  }

  if (af.attendance_role) config.attendance_role = af.attendance_role
  if (af.show_to_approver === false) config.show_to_approver = false

  // data_source (dataset-bound dropdowns / radios / multiselects)
  if (
    af.data_source_dataset_key &&
    af.data_source_label_column_key &&
    af.data_source_value_column_key
  ) {
    const dsId = maps.datasetKeyToId.get(af.data_source_dataset_key)
    const colMap = maps.datasetColumnKeyToId.get(af.data_source_dataset_key)
    const labelColId = colMap?.get(af.data_source_label_column_key)
    const valueColId = colMap?.get(af.data_source_value_column_key)
    if (dsId && labelColId && valueColId) {
      config.data_source = {
        dataset_id: dsId,
        label_column: labelColId,
        value_column: valueColId,
      }
    }
  }

  // dataset_lookup
  if (af.type === "dataset_lookup") {
    const lookupFieldId = af.lookup_field_key
      ? maps.fieldKeyToId.get(af.lookup_field_key)
      : undefined
    const lookupDsId = af.lookup_dataset_key
      ? maps.datasetKeyToId.get(af.lookup_dataset_key)
      : undefined
    const lookupColId =
      af.lookup_dataset_key && af.lookup_column_key
        ? maps.datasetColumnKeyToId.get(af.lookup_dataset_key)?.get(af.lookup_column_key)
        : undefined
    if (lookupFieldId) config.lookup_field_id = lookupFieldId
    if (lookupDsId) config.lookup_dataset_id = lookupDsId
    if (lookupColId) config.lookup_column_id = lookupColId
  }

  // ai_computed
  if (af.type === "ai_computed") {
    if (af.prompt_template) config.prompt_template = af.prompt_template
    if (af.ai_model) config.ai_model = af.ai_model
  }

  // conditions
  if (af.conditions && af.conditions.rules.length > 0) {
    const rules: FieldCondition["rules"] = []
    for (const r of af.conditions.rules) {
      const sourceId = maps.fieldKeyToId.get(r.field_key)
      if (!sourceId) continue
      const rule: FieldCondition["rules"][number] = {
        fieldId: sourceId,
        operator: r.operator,
      }
      if (r.value != null && r.value !== "") rule.value = r.value
      if (r.dataset_column_key) {
        const srcField = allAiFields.find((f) => f.key === r.field_key)
        const dsKey = srcField?.data_source_dataset_key ?? srcField?.lookup_dataset_key
        if (dsKey) {
          const colId = maps.datasetColumnKeyToId.get(dsKey)?.get(r.dataset_column_key)
          if (colId) rule.dataset_column = colId
        }
      }
      rules.push(rule)
    }
    if (rules.length > 0) {
      config.conditions = { match: af.conditions.match, rules }
    }
  }

  return config
}

function buildFieldsFromAI(aiFields: AIField[], maps: KeyMaps): FieldConfig[] {
  // Pre-assign IDs so conditions referencing later fields still work
  for (const f of aiFields) {
    if (!maps.fieldKeyToId.has(f.key)) maps.fieldKeyToId.set(f.key, nanoid())
  }
  return aiFields.map((af) => buildFieldConfig(af, maps, aiFields))
}

// Legacy helper kept for chat mode (one-field-at-a-time insertion with existing form context)
function mapAIFieldsToFieldConfig(
  aiFields: AIField[],
  existingFields: FieldConfig[] = []
): FieldConfig[] {
  const maps = emptyMaps()
  // Seed with existing form fields so added fields can condition on them (by existing field's id as key)
  for (const f of existingFields) {
    maps.fieldKeyToId.set(f.id, f.id)
  }
  return buildFieldsFromAI(aiFields, maps)
}

// ─── One-shot form generation ──────────────────────────────────────────────

export async function generateFormWithAI(
  prompt: string
): Promise<{ formId?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { error: "OpenAI API key not configured" }
  if (!prompt.trim()) return { error: "נא להזין תיאור לטופס" }

  try {
    const client = new OpenAI({ apiKey })

    const completion = await client.chat.completions.parse({
      model: FORM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(FormGenerationSchema, "form_generation"),
    })

    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed) return { error: "לא התקבלה תשובה תקינה מהמודל" }

    const maps = emptyMaps()
    const datasets = buildDatasets(parsed.datasets, maps)
    const fields = buildFieldsFromAI(parsed.fields, maps)

    // Settings
    const settings: FormSettings = {
      title_align: "right",
      submit_label: parsed.submit_label ?? "שלח",
      after_submit: parsed.after_submit ?? "thank_you",
    }
    if (parsed.submit_message) settings.submit_message = parsed.submit_message
    if (parsed.after_submit === "redirect" && parsed.redirect_url) {
      settings.redirect_url = parsed.redirect_url
    }
    if (parsed.hide_branding) settings.hide_branding = true

    if (parsed.submission_limit_field_key && parsed.submission_limit_count) {
      const limitFieldId = maps.fieldKeyToId.get(parsed.submission_limit_field_key)
      if (limitFieldId) {
        settings.submission_limit_field_id = limitFieldId
        settings.submission_limit_count = parsed.submission_limit_count
        if (parsed.submission_limit_error_message) {
          settings.submission_limit_error_message = parsed.submission_limit_error_message
        }
      }
    }
    if (parsed.submission_start_date) settings.submission_start_date = parsed.submission_start_date
    if (parsed.submission_end_date) settings.submission_end_date = parsed.submission_end_date

    // Approval workflow
    if (parsed.approval_workflow && parsed.approval_workflow.enabled) {
      const steps: ApprovalWorkflow["steps"] = []
      for (const s of parsed.approval_workflow.steps) {
        const step: ApprovalWorkflow["steps"][number] = {
          approver_name: s.approver_name,
          channel: s.channel,
          source_type: s.source_type,
        }
        if (s.source_type === "fixed" && s.target) step.target = s.target
        if (s.source_type === "from_field" && s.source_field_key) {
          const fid = maps.fieldKeyToId.get(s.source_field_key)
          if (fid) step.source_field_id = fid
        }
        if (s.source_type === "from_option_map" && s.source_field_key) {
          const fid = maps.fieldKeyToId.get(s.source_field_key)
          if (fid) {
            step.source_field_id = fid
            if (s.target_by_value) {
              step.target_by_value = Object.fromEntries(
                s.target_by_value.map((m) => [m.option, m.target])
              )
            }
          }
        }
        steps.push(step)
      }
      settings.approval_workflow = { enabled: true, steps }
    }

    if (parsed.approval_field_visibility) {
      const v = parsed.approval_field_visibility
      if (v.mode === "all") {
        settings.approval_field_visibility = { mode: "all" }
      } else if (v.mode === "selected" && v.visible_field_keys) {
        const ids = v.visible_field_keys
          .map((k) => maps.fieldKeyToId.get(k))
          .filter((id): id is string => !!id)
        settings.approval_field_visibility = {
          mode: "selected",
          visible_field_ids: ids,
        }
      }
    }

    // Schema (datasets)
    const schema: FormSchema = datasets.length > 0 ? { datasets } : {}

    const result = await createForm({
      name: parsed.name,
      description: parsed.description,
      fields,
      settings,
      schema,
      form_type: (parsed.form_type ?? "general") as FormType,
      is_published: false,
    })

    if (result.error) return { error: result.error }
    return { formId: result.form?.id }
  } catch (err) {
    console.error("AI form generation error:", err)
    const message = err instanceof Error ? err.message : "שגיאה לא צפויה"
    return { error: `שגיאה ביצירת הטופס: ${message}` }
  }
}

// ─── v2: Iterative editing with tool calling (form builder) ───────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "tool"
  content: string
  tool_call_id?: string
}

const AddFieldsParams = z.object({
  fields: z.array(AIFieldSchema),
  insert_after_label: z.string().nullable(),
})

const UpdateFieldParams = z.object({
  field_label: z.string(),
  updates: z.object({
    label: z.string().nullable(),
    required: z.boolean().nullable(),
    placeholder: z.string().nullable(),
    options: z.array(z.string()).nullable(),
    allow_other: z.boolean().nullable(),
    paragraph_style: z
      .enum(["default", "info", "success", "warning", "danger"])
      .nullable(),
    validation_type: z.enum(VALIDATION_TYPES).nullable(),
    validation_pattern: z.string().nullable(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    step: z.number().nullable(),
    date_mode: z.enum(["date", "datetime"]).nullable(),
    content: z.string().nullable(),
    default_value: z.string().nullable(),
  }),
})

const RemoveFieldParams = z.object({
  field_label: z.string(),
})

const ReorderFieldParams = z.object({
  field_label: z.string(),
  move_after_label: z.string().nullable(),
})

const EDITOR_SYSTEM_PROMPT = `You are an AI assistant inside a Hebrew form builder. The user can ask you to modify the form they are currently editing.

You have 4 tools available:
- add_fields: Add new fields to the form. Use the FULL field schema (all field types, conditions, validation, content, min/max, dataset lookups, AI computed, sections, etc. — same schema as one-shot form generation). When adding a conditional field referencing an EXISTING form field, use that field's id (shown next to each field below) as the field_key in the condition rule. Insert_after_label to place after a specific field.
- update_field: Update properties of an existing field (find it by its label).
- remove_field: Remove a field (find it by its label).
- reorder_field: Move a field to a different position.

The current form fields are provided below (each with its id — use id as a condition field_key when adding conditional fields referencing existing fields). When the user asks for changes, use the appropriate tool(s). You can call multiple tools in one response.

If the user asks a question (not a modification), respond with text only - no tool calls.

ALWAYS respond in Hebrew. Set nullable fields you don't use to null.`

function serializeFieldsForContext(fields: FieldConfig[]): string {
  return fields
    .map((f, i) => {
      let desc = `${i + 1}. [${f.type}] "${f.label}" (id: ${f.id})`
      if (f.required) desc += " *חובה"
      if (f.options?.length) desc += ` (אפשרויות: ${f.options.join(", ")})`
      if (f.validation) desc += ` [ולידציה: ${f.validation.type}]`
      if (f.conditions) desc += " [מותנה]"
      if (f.paragraph_style) desc += ` [סגנון: ${f.paragraph_style}]`
      return desc
    })
    .join("\n")
}

function applyToolCalls(
  fields: FieldConfig[],
  toolCalls: Array<{ name: string; args: unknown }>
): { fields: FieldConfig[]; summary: string[] } {
  let result = [...fields]
  const summary: string[] = []

  for (const { name, args } of toolCalls) {
    switch (name) {
      case "add_fields": {
        const parsed = args as z.infer<typeof AddFieldsParams>
        const newFields = mapAIFieldsToFieldConfig(parsed.fields, result)

        if (parsed.insert_after_label) {
          const idx = result.findIndex((f) => f.label === parsed.insert_after_label)
          if (idx !== -1) {
            result.splice(idx + 1, 0, ...newFields)
          } else {
            result.push(...newFields)
          }
        } else {
          result.push(...newFields)
        }

        summary.push(`${newFields.length} שדות נוספו`)
        break
      }

      case "update_field": {
        const parsed = args as z.infer<typeof UpdateFieldParams>
        const idx = result.findIndex((f) => f.label === parsed.field_label)

        if (idx !== -1) {
          const field = { ...result[idx] }
          const u = parsed.updates

          if (u.label) field.label = u.label
          if (u.required !== null) field.required = u.required
          if (u.placeholder) field.placeholder = u.placeholder
          if (u.options) field.options = u.options
          if (u.allow_other !== null) field.allow_other = u.allow_other || undefined
          if (u.paragraph_style && u.paragraph_style !== "default") {
            field.paragraph_style = u.paragraph_style
          }
          if (u.validation_type && u.validation_type !== "none") {
            field.validation = {
              type: u.validation_type,
              ...(u.validation_type === "custom_regex" && u.validation_pattern
                ? { custom_pattern: u.validation_pattern }
                : {}),
            }
          }
          if (typeof u.min === "number") field.min = u.min
          if (typeof u.max === "number") field.max = u.max
          if (typeof u.step === "number") field.step = u.step
          if (u.date_mode) field.date_mode = u.date_mode
          if (u.content !== null && u.content !== undefined) field.content = u.content
          if (u.default_value !== null && u.default_value !== undefined) field.default_value = u.default_value

          result[idx] = field
          summary.push(`"${parsed.field_label}" עודכן`)
        }
        break
      }

      case "remove_field": {
        const parsed = args as z.infer<typeof RemoveFieldParams>
        const before = result.length
        result = result.filter((f) => f.label !== parsed.field_label)
        if (result.length < before) summary.push(`"${parsed.field_label}" הוסר`)
        break
      }

      case "reorder_field": {
        const parsed = args as z.infer<typeof ReorderFieldParams>
        const idx = result.findIndex((f) => f.label === parsed.field_label)

        if (idx !== -1) {
          const [field] = result.splice(idx, 1)
          if (parsed.move_after_label) {
            const targetIdx = result.findIndex((f) => f.label === parsed.move_after_label)
            if (targetIdx !== -1) result.splice(targetIdx + 1, 0, field)
            else result.push(field)
          } else {
            result.unshift(field)
          }
          summary.push(`"${parsed.field_label}" הוזז`)
        }
        break
      }
    }
  }

  return { fields: result, summary }
}

export async function chatWithFormAI(input: {
  message: string
  currentFields: FieldConfig[]
  history: ChatMessage[]
}): Promise<{
  fields: FieldConfig[]
  aiMessage: string
  history: ChatMessage[]
  summary: string[]
  error?: string
}> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return {
      fields: input.currentFields,
      aiMessage: "",
      history: input.history,
      summary: [],
      error: "OpenAI API key not configured",
    }
  }

  const fieldsContext = serializeFieldsForContext(input.currentFields)
  const systemContent = `${EDITOR_SYSTEM_PROMPT}\n\nשדות הטופס הנוכחיים:\n${fieldsContext}`

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...input.history.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool" as const,
          content: m.content,
          tool_call_id: m.tool_call_id ?? "",
        }
      }
      return {
        role: m.role as "user" | "assistant",
        content: m.content,
      }
    }),
    { role: "user", content: input.message },
  ]

  try {
    const client = new OpenAI({ apiKey })

    const completion = await client.chat.completions.parse({
      model: EDITOR_MODEL,
      messages,
      tools: [
        zodFunction({
          name: "add_fields",
          parameters: AddFieldsParams,
          description: "Add new fields to the form (full field schema — all types, conditions, validation, sections, etc.)",
        }),
        zodFunction({
          name: "update_field",
          parameters: UpdateFieldParams,
          description: "Update an existing field's properties",
        }),
        zodFunction({
          name: "remove_field",
          parameters: RemoveFieldParams,
          description: "Remove a field from the form",
        }),
        zodFunction({
          name: "reorder_field",
          parameters: ReorderFieldParams,
          description: "Move a field to a different position",
        }),
      ],
    })

    const choice = completion.choices[0]
    if (!choice) {
      return {
        fields: input.currentFields,
        aiMessage: "לא התקבלה תשובה מהמודל",
        history: input.history,
        summary: [],
      }
    }

    const msg = choice.message
    const toolCalls = msg.tool_calls ?? []

    const newHistory: ChatMessage[] = [
      ...input.history,
      { role: "user", content: input.message },
    ]

    if (toolCalls.length === 0) {
      const text = msg.content ?? ""
      newHistory.push({ role: "assistant", content: text })
      return {
        fields: input.currentFields,
        aiMessage: text,
        history: newHistory,
        summary: [],
      }
    }

    const parsedCalls = toolCalls.map((tc) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
      id: tc.id,
    }))

    const { fields: updatedFields, summary } = applyToolCalls(input.currentFields, parsedCalls)

    const assistantContent = msg.content ?? (summary.join(", ") || "השינויים בוצעו")
    newHistory.push({ role: "assistant", content: assistantContent })

    return {
      fields: updatedFields,
      aiMessage: assistantContent,
      history: newHistory,
      summary,
    }
  } catch (err) {
    console.error("AI chat error:", err)
    const message = err instanceof Error ? err.message : "שגיאה לא צפויה"
    return {
      fields: input.currentFields,
      aiMessage: "",
      history: input.history,
      summary: [],
      error: `שגיאה: ${message}`,
    }
  }
}

// ─── v3: AI Computed Field ────────────────────────────────────────────────────

export async function computeAIField(input: {
  promptTemplate: string
  fieldValues: Record<string, string>
  model?: string
}): Promise<{ result?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { error: "OpenAI API key not configured" }

  let resolvedPrompt = input.promptTemplate
  for (const [label, value] of Object.entries(input.fieldValues)) {
    resolvedPrompt = resolvedPrompt.replaceAll(`{{${label}}}`, value || "(לא מולא)")
  }

  try {
    const client = new OpenAI({ apiKey })
    const model =
      input.model && input.model !== "$undefined" ? input.model : COMPUTE_MODEL

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "אתה עוזר חכם בתוך טופס דיגיטלי. ענה בעברית טבעית, 3-4 משפטים בלבד. אסור להחזיר JSON, מפתחות, כותרות, רשימות נקודות, או פורמט 'כותרת: ערך'. כתוב פסקה קצרה וזורמת ישירות למשתמש. אל תוסיף הסברים מיותרים.",
        },
        { role: "user", content: resolvedPrompt },
      ],
      max_completion_tokens: 1024,
      ...(model.startsWith("gpt-5") ? { reasoning_effort: "minimal" as const } : {}),
    })

    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) return { error: "לא התקבלה תשובה מהמודל" }

    return { result: text }
  } catch (err) {
    console.error("AI compute error:", err)
    const message = err instanceof Error ? err.message : "שגיאה לא צפויה"
    return { error: message }
  }
}
