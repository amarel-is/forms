// ─── Field types ─────────────────────────────────────────────────────────────

/** Input fields — collect user answers */
export type InputFieldType =
  | "text"
  | "long_answer"
  | "dropdown"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "number"
  | "date"
  | "star_rating"
  | "entry_exit"
  | "location"
  | "signature"

/** Layout/visual fields — display only, no answer collected */
export type LayoutFieldType = "heading" | "subheading" | "paragraph" | "divider" | "image" | "link" | "section" | "dataset_lookup" | "ai_computed"

export type FieldType = InputFieldType | LayoutFieldType

export const LAYOUT_FIELD_TYPES: LayoutFieldType[] = [
  "heading",
  "subheading",
  "paragraph",
  "divider",
  "image",
  "link",
  "section",
  "dataset_lookup",
  "ai_computed",
]

export function isLayoutField(type: FieldType): type is LayoutFieldType {
  return (LAYOUT_FIELD_TYPES as string[]).includes(type)
}

// ─── Field config ─────────────────────────────────────────────────────────────

// ─── Conditional logic ────────────────────────────────────────────────────────

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than"

export interface ConditionRule {
  fieldId: string
  operator: ConditionOperator
  value?: string          // omitted for is_empty / is_not_empty
  dataset_column?: string // compare this dataset column instead of the raw field value
}

export interface FieldCondition {
  match: "all" | "any"   // AND / OR between rules
  rules: ConditionRule[]
}

// ─── Text field validation ────────────────────────────────────────────────────

export type TextValidationType =
  | "none"
  | "numbers_only"
  | "text_only"
  | "phone_il"
  | "id_il"
  | "custom_regex"

export interface FieldValidation {
  type: TextValidationType
  custom_pattern?: string   // regex string for custom_regex
}

export interface FieldConfig {
  id: string
  type: FieldType
  /** For input fields: the question label shown above the input.
   *  For heading/subheading: the text to display.
   *  For paragraph: a short title (shown in builder list).
   *  For image: caption / alt text.
   *  For divider: ignored. */
  label: string
  /** Input fields: placeholder hint text.
   *  Image field: the image URL (src). */
  placeholder?: string
  required: boolean               // only meaningful for input fields
  options?: string[]              // dropdown, multiselect & radio
  allow_other?: boolean           // dropdown, multiselect & radio — adds "Other + please specify"
  default_value?: string | string[] | boolean  // pre-filled value shown to the user
  min?: number                    // number field: minimum value
  max?: number                    // number field: maximum value
  step?: number                   // number field: step increment
  content?: string                // paragraph body text; image URL alternative
  paragraph_style?: "default" | "info" | "success" | "warning" | "danger"
  validation?: FieldValidation    // text field validation rule
  date_mode?: "date" | "datetime" // date field: date-only or datetime
  conditions?: FieldCondition     // visibility rules — shown when conditions met
  attendance_role?: "id_number" | "name" | "division" | "direction"
  show_to_approver?: boolean      // approval forms: visible in approver page (default: true)
  data_source?: {
    dataset_id: string
    label_column: string
    value_column: string
  }
  lookup_field_id?: string     // dataset_lookup: which field's value to watch
  lookup_dataset_id?: string   // dataset_lookup: which dataset to search
  lookup_column_id?: string    // dataset_lookup: which column value to display
  prompt_template?: string     // ai_computed: prompt with {{field label}} placeholders
  ai_model?: string            // ai_computed: model to use (default: gpt-5-mini)
}

// ─── Form types ───────────────────────────────────────────────────────────────

export type FormType = "general" | "attendance" | "approval"

// ─── Approval workflow config ─────────────────────────────────────────────────

export type ApprovalTargetSource = "fixed" | "from_field" | "from_option_map"

export interface ApprovalWorkflowStep {
  approver_name: string
  channel: "email" | "whatsapp"
  source_type: ApprovalTargetSource
  target?: string
  source_field_id?: string
  target_by_value?: Record<string, string>
}

export interface ApprovalWorkflow {
  enabled: boolean
  steps: ApprovalWorkflowStep[]
}

export interface ApprovalFieldVisibility {
  mode: "all" | "selected"
  visible_field_ids?: string[]
}

export interface FormSettings {
  submit_message?: string
  submit_label?: string           // text on the submit button (default: "שלח")
  after_submit?: "thank_you" | "redirect"  // what happens after form is submitted
  redirect_url?: string           // used when after_submit === "redirect"
  attendance_id_field?: string
  attendance_direction_field?: string
  title_align?: "right" | "center" | "left"
  hide_branding?: boolean         // hide "מופעל על ידי אמרל טפסים" in public/embed views
  approval_workflow?: ApprovalWorkflow
  approval_field_visibility?: ApprovalFieldVisibility
  submission_limit_field_id?: string  // field whose value is the unique identifier for limiting submissions
  submission_limit_count?: number     // max submissions allowed per unique value (default: 1)
  submission_limit_error_message?: string // custom error shown when limit is exceeded
}

// ─── Per-form datasets ("mini databases") ────────────────────────────────────

export interface DatasetColumn {
  id: string
  name: string
  type: "text" | "number"
}

export interface DatasetRow {
  id: string
  [columnId: string]: string | number
}

export interface FormDataset {
  id: string
  name: string
  columns: DatasetColumn[]
  rows: DatasetRow[]
}

export interface FormSchema {
  datasets?: FormDataset[]
  [key: string]: unknown
}

export interface Form {
  id: string
  user_id: string
  name: string
  description: string | null
  fields: FieldConfig[]
  settings: FormSettings
  schema: FormSchema
  form_type: FormType
  is_published: boolean
  folder: string | null
  created_at: string
  updated_at: string
}

export interface FormResponse {
  id: string
  form_id: string
  data: Record<string, string | string[]>
  submitted_at: string
  approval?: ResponseApproval | null
}

// ─── Approval runtime types ──────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "in_progress" | "approved" | "rejected" | "expired"
export type ApprovalStepStatus = "waiting" | "pending" | "approved" | "rejected" | "expired"

export interface ResponseApprovalStep {
  id: string
  response_approval_id: string
  step_index: number
  approver_name: string
  approver_channel: "email" | "whatsapp"
  approver_target: string
  status: ApprovalStepStatus
  acted_at: string | null
  decision_note: string | null
}

export interface ResponseApproval {
  id: string
  response_id: string
  form_id: string
  status: ApprovalStatus
  current_step_index: number
  started_at: string
  finished_at: string | null
  steps: ResponseApprovalStep[]
}

// ─── Presence helpers (attendance forms) ─────────────────────────────────────

export interface PresenceRecord {
  name: string
  id_number: string
  division: string
  direction: "כניסה" | "יציאה"
  submitted_at: string
}

// ─── JSON type for Supabase jsonb columns ────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Supabase Database schema ─────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      forms: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          fields: Json
          settings: Json
          schema: Json
          form_type: string
          is_published: boolean
          folder: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          fields?: Json
          settings?: Json
          schema?: Json
          form_type?: string
          is_published?: boolean
          folder?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          fields?: Json
          settings?: Json
          schema?: Json
          form_type?: string
          is_published?: boolean
          folder?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          id: string
          form_id: string
          data: Json
          submitted_at: string
        }
        Insert: {
          id?: string
          form_id: string
          data?: Json
          submitted_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          data?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ─── Cast helpers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToForm(row: any): Form {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description ?? null,
    fields: (row.fields as unknown as FieldConfig[]) ?? [],
    settings: (row.settings as unknown as FormSettings) ?? {},
    schema: (row.schema as unknown as FormSchema) ?? {},
    form_type: (row.form_type ?? "general") as FormType,
    is_published: row.is_published ?? false,
    folder: row.folder ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToResponse(row: any): FormResponse {
  return {
    id: row.id,
    form_id: row.form_id,
    data: (row.data as unknown as Record<string, string | string[]>) ?? {},
    submitted_at: row.submitted_at,
  }
}

// ─── Attendance helpers ───────────────────────────────────────────────────────

export function buildAttendanceFields(): FieldConfig[] {
  return [
    {
      id: "att_name",
      type: "text",
      label: "שם מלא",
      placeholder: "ישראל ישראלי",
      required: true,
      attendance_role: "name",
    },
    {
      id: "att_id",
      type: "text",
      label: "תעודת זהות",
      placeholder: "123456789",
      required: true,
      attendance_role: "id_number",
    },
    {
      id: "att_division",
      type: "dropdown",
      label: "חטיבה",
      required: true,
      options: ["הנהלה", "כספים", "מבצעים", "לוגיסטיקה", "טכנולוגיה", "משאבי אנוש", "שיווק", "אחר"],
      attendance_role: "division",
    },
    {
      id: "att_direction",
      type: "entry_exit",
      label: "סטטוס",
      required: true,
      attendance_role: "direction",
    },
  ]
}

export function computePresence(
  responses: FormResponse[],
  form: Form
): PresenceRecord[] {
  const dirField =
    form.fields.find((f) => f.attendance_role === "direction")?.id ??
    form.settings.attendance_direction_field

  const idField =
    form.fields.find((f) => f.attendance_role === "id_number")?.id ??
    form.settings.attendance_id_field

  const nameField = form.fields.find((f) => f.attendance_role === "name")?.id
  const divField = form.fields.find((f) => f.attendance_role === "division")?.id

  // direction field is required; id_number is preferred but name is a valid fallback key
  if (!dirField) return []
  const keyField = idField ?? nameField
  if (!keyField) return []

  const latestByPerson = new Map<string, FormResponse>()
  for (const r of [...responses].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  )) {
    const key = (r.data[keyField] as string) ?? ""
    if (key && !latestByPerson.has(key)) {
      latestByPerson.set(key, r)
    }
  }

  const present: PresenceRecord[] = []
  latestByPerson.forEach((r, key) => {
    const dir = r.data[dirField] as string
    present.push({
      id_number: idField ? (r.data[idField] as string) ?? key : key,
      name: nameField ? (r.data[nameField] as string) ?? "" : "",
      division: divField ? (r.data[divField] as string) ?? "" : "",
      direction: dir as "כניסה" | "יציאה",
      submitted_at: r.submitted_at,
    })
  })

  return present
}
