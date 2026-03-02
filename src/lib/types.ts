// ─── Domain types ─────────────────────────────────────────────────────────────

export type FieldType = "text" | "dropdown" | "multiselect" | "entry_exit"

export type FormType = "general" | "attendance"

export interface FieldConfig {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  options?: string[]       // dropdown & multiselect only
  // attendance meta — marks the purpose of this field so the presence
  // dashboard can identify the employee key and the direction value
  attendance_role?: "id_number" | "name" | "division" | "direction"
}

export interface FormSettings {
  submit_message?: string
  // attendance-specific config
  attendance_id_field?: string   // field ID used as the unique employee key
  attendance_direction_field?: string  // field ID holding כניסה/יציאה
}

export interface FormSchema {
  // reserved for future per-field validation rules or computed fields
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
  created_at: string
  updated_at: string
}

export interface FormResponse {
  id: string
  form_id: string
  data: Record<string, string | string[]>
  submitted_at: string
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

export function rowToForm(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any
): Form {
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
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function rowToResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any
): FormResponse {
  return {
    id: row.id,
    form_id: row.form_id,
    data: (row.data as unknown as Record<string, string | string[]>) ?? {},
    submitted_at: row.submitted_at,
  }
}

// ─── Attendance helpers ───────────────────────────────────────────────────────

/** Build the standard attendance form fields */
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
      options: ["מחלקה א", "מחלקה ב", "מחלקה ג", "הנהלה", "אחר"],
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

/** From a list of responses, compute who is currently present in the office */
export function computePresence(
  responses: FormResponse[],
  form: Form
): PresenceRecord[] {
  // Find the field that holds direction and the unique-key field
  const dirField =
    form.fields.find((f) => f.attendance_role === "direction")?.id ??
    form.settings.attendance_direction_field

  const idField =
    form.fields.find((f) => f.attendance_role === "id_number")?.id ??
    form.settings.attendance_id_field

  const nameField = form.fields.find((f) => f.attendance_role === "name")?.id
  const divField = form.fields.find((f) => f.attendance_role === "division")?.id

  if (!dirField || !idField) return []

  // Group by id_number, keep only the latest response per person
  const latestByPerson = new Map<string, FormResponse>()
  for (const r of [...responses].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  )) {
    const key = (r.data[idField] as string) ?? ""
    if (key && !latestByPerson.has(key)) {
      latestByPerson.set(key, r)
    }
  }

  const present: PresenceRecord[] = []
  latestByPerson.forEach((r, key) => {
    const dir = r.data[dirField] as string
    present.push({
      id_number: key,
      name: nameField ? (r.data[nameField] as string) ?? "" : "",
      division: divField ? (r.data[divField] as string) ?? "" : "",
      direction: dir as "כניסה" | "יציאה",
      submitted_at: r.submitted_at,
    })
  })

  return present
}
