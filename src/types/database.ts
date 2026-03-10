export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      forms: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          form_type: string
          id: string
          is_published: boolean
          name: string
          schema: Json
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_published?: boolean
          name: string
          schema?: Json
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_published?: boolean
          name?: string
          schema?: Json
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          form_id: string
          form_name: string
          id: string
          is_read: boolean
          response_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          form_name: string
          id?: string
          is_read?: boolean
          response_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          form_name?: string
          id?: string
          is_read?: boolean
          response_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          data: Json
          form_id: string
          id: string
          submitted_at: string
        }
        Insert: {
          data?: Json
          form_id: string
          id?: string
          submitted_at?: string
        }
        Update: {
          data?: Json
          form_id?: string
          id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attendance_presence: {
        Row: {
          data: Json | null
          form_id: string | null
          rn: number | null
          submitted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]
