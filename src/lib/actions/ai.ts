"use server"

import { nanoid } from "nanoid"
import { z } from "zod"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { zodFunction } from "openai/helpers/zod"
import { createForm } from "./forms"
import type { FieldConfig, FieldCondition } from "@/lib/types"

// בחירת מודלים:
// - gpt-5.4: יצירת טופס + עריכת טופס (reasoning חזק)
// - gpt-5-nano: חישוב שדה AI (קצר, זול, מהיר)
const FORM_MODEL = "gpt-5.4"
const EDITOR_MODEL = "gpt-5.4"
const COMPUTE_MODEL = "gpt-5-nano"

// ─── Shared field schema (nullable instead of optional for OpenAI compatibility) ─

const AIFieldSchema = z.object({
  type: z.enum([
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
    "heading",
    "subheading",
    "paragraph",
    "divider",
  ]),
  label: z.string(),
  required: z.boolean(),
  placeholder: z.string().nullable(),
  options: z.array(z.string()).nullable(),
  allow_other: z.boolean().nullable(),
  paragraph_style: z
    .enum(["default", "info", "success", "warning", "danger"])
    .nullable(),
  validation_type: z
    .enum(["none", "numbers_only", "text_only", "phone_il", "id_il"])
    .nullable(),
  date_mode: z.enum(["date", "datetime"]).nullable(),
  default_value_now: z.boolean().nullable(),
  condition_field_label: z.string().nullable(),
  condition_operator: z
    .enum([
      "equals",
      "not_equals",
      "contains",
      "not_contains",
      "is_empty",
      "is_not_empty",
    ])
    .nullable(),
  condition_value: z.string().nullable(),
})

type AIField = z.infer<typeof AIFieldSchema>

// ─── v1: One-shot form generation (dashboard) ─────────────────────────────────

const FormGenerationSchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(AIFieldSchema),
  submit_label: z.string().nullable(),
})

const SYSTEM_PROMPT = `You are an expert Hebrew form builder. You create digital forms for Israeli organizations.

When the user describes a form they need, generate a complete form structure with fields, validation, and conditional logic.

Guidelines:
- All labels and text MUST be in Hebrew
- Use appropriate field types: text for short answers, long_answer for paragraphs, dropdown/radio for single choice, multiselect for multiple choices, checkbox for boolean confirmations
- Add heading/subheading/divider/paragraph layout elements to organize the form visually
- Use entry_exit for attendance (entry/exit) forms
- Use location for GPS tracking fields
- Use signature for signature fields
- Set validation_type for text fields: phone_il for Israeli phones, id_il for Israeli ID numbers, numbers_only for numeric text
- Use date_mode "datetime" when time is needed, "date" for date-only
- Set default_value_now to true for date fields that should auto-fill with current date/time
- Use paragraph_style for styled paragraphs: info (blue), success (green), warning (orange), danger (red)
- Use conditional logic (condition_field_label + condition_operator + condition_value) to show/hide fields based on other field values. Reference the SOURCE field by its exact label text.
- For radio/dropdown with "other" option, set allow_other to true
- Set required appropriately - key fields should be required
- Generate a meaningful submit_label in Hebrew (e.g. "שלח טופס", "שלח דיווח")
- Keep the form practical and well-organized
- For nullable fields you don't need, set them to null`

function mapAIFieldsToFieldConfig(aiFields: AIField[]): FieldConfig[] {
  const labelToId = new Map<string, string>()

  const ids = aiFields.map((af) => {
    const id = nanoid()
    labelToId.set(af.label, id)
    return id
  })

  return ids.map((id, i) => {
    const af = aiFields[i]

    let conditions: FieldCondition | undefined
    if (af.condition_field_label && af.condition_operator) {
      const sourceId = labelToId.get(af.condition_field_label)
      if (sourceId) {
        conditions = {
          match: "all",
          rules: [
            {
              fieldId: sourceId,
              operator: af.condition_operator,
              ...(af.condition_value ? { value: af.condition_value } : {}),
            },
          ],
        }
      }
    }

    return buildFieldConfig(id, af, conditions)
  })
}

function buildFieldConfig(
  id: string,
  f: AIField,
  conditions?: FieldCondition
): FieldConfig {
  const config: FieldConfig = {
    id,
    type: f.type,
    label: f.label,
    required: f.required,
  }

  if (f.placeholder) config.placeholder = f.placeholder
  if (f.options && f.options.length > 0) config.options = f.options
  if (f.allow_other) config.allow_other = true
  if (f.paragraph_style && f.paragraph_style !== "default") {
    config.paragraph_style = f.paragraph_style
  }
  if (f.validation_type && f.validation_type !== "none") {
    config.validation = { type: f.validation_type }
  }
  if (f.date_mode) config.date_mode = f.date_mode
  if (f.default_value_now) config.default_value = "__now__"
  if (f.type === "paragraph" && !config.content) config.content = f.label
  if (conditions) config.conditions = conditions

  return config
}

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
      response_format: zodResponseFormat(
        FormGenerationSchema,
        "form_generation"
      ),
    })

    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed) return { error: "לא התקבלה תשובה תקינה מהמודל" }

    const fields = mapAIFieldsToFieldConfig(parsed.fields)

    const result = await createForm({
      name: parsed.name,
      description: parsed.description,
      fields,
      settings: {
        title_align: "right",
        submit_label: parsed.submit_label ?? "שלח",
        after_submit: "thank_you",
      },
      form_type: "general",
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
    validation_type: z
      .enum(["none", "numbers_only", "text_only", "phone_il", "id_il"])
      .nullable(),
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
- add_fields: Add new fields to the form. Use insert_after_label to place them after a specific field (by label), or null to append at the end.
- update_field: Update properties of an existing field (find it by its label).
- remove_field: Remove a field (find it by its label).
- reorder_field: Move a field to a different position. Set move_after_label to the label of the field it should come after, or null to move it to the beginning.

The current form fields are provided below. When the user asks for changes, use the appropriate tool(s). You can call multiple tools in one response.

If the user asks a question (not a modification), respond with text only - no tool calls.

ALWAYS respond in Hebrew.
For nullable fields you don't need, set them to null.`

function serializeFieldsForContext(fields: FieldConfig[]): string {
  return fields
    .map((f, i) => {
      let desc = `${i + 1}. [${f.type}] "${f.label}"`
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
        const newFields = mapAIFieldsToFieldConfig(parsed.fields)

        if (parsed.insert_after_label) {
          const idx = result.findIndex(
            (f) => f.label === parsed.insert_after_label
          )
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
          if (u.allow_other !== null) {
            field.allow_other = u.allow_other || undefined
          }
          if (u.paragraph_style && u.paragraph_style !== "default") {
            field.paragraph_style = u.paragraph_style
          }
          if (u.validation_type && u.validation_type !== "none") {
            field.validation = { type: u.validation_type }
          }

          result[idx] = field
          summary.push(`"${parsed.field_label}" עודכן`)
        }
        break
      }

      case "remove_field": {
        const parsed = args as z.infer<typeof RemoveFieldParams>
        const before = result.length
        result = result.filter((f) => f.label !== parsed.field_label)

        if (result.length < before) {
          summary.push(`"${parsed.field_label}" הוסר`)
        }
        break
      }

      case "reorder_field": {
        const parsed = args as z.infer<typeof ReorderFieldParams>
        const idx = result.findIndex((f) => f.label === parsed.field_label)

        if (idx !== -1) {
          const [field] = result.splice(idx, 1)

          if (parsed.move_after_label) {
            const targetIdx = result.findIndex(
              (f) => f.label === parsed.move_after_label
            )
            if (targetIdx !== -1) {
              result.splice(targetIdx + 1, 0, field)
            } else {
              result.push(field)
            }
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
          description: "Add new fields to the form",
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

    const { fields: updatedFields, summary } = applyToolCalls(
      input.currentFields,
      parsedCalls
    )

    const assistantContent =
      msg.content ?? (summary.join(", ") || "השינויים בוצעו")

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
    resolvedPrompt = resolvedPrompt.replaceAll(
      `{{${label}}}`,
      value || "(לא מולא)"
    )
  }

  try {
    const client = new OpenAI({ apiKey })
    const model =
      input.model && input.model !== "$undefined"
        ? input.model
        : COMPUTE_MODEL

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
      ...(model.startsWith("gpt-5")
        ? { reasoning_effort: "minimal" as const }
        : {}),
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