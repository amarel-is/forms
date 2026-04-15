import { Metadata } from "next"
import { notFound } from "next/navigation"
import { FormRenderer } from "@/components/form-renderer/form-renderer"
import { createClient } from "@/lib/supabase/server"
import { rowToForm } from "@/lib/types"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any)
    .from("forms")
    .select("name, description")
    .eq("id", id)
    .single()

  return {
    title: row?.name ?? "טופס",
    description: row?.description ?? undefined,
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      viewportFit: "cover",
    },
  }
}

export default async function PublicFillPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("forms")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !row) notFound()

  const form = rowToForm(row)

  if (!form.is_published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
              <path d="M12 2C8.13 2 5 5.13 5 9v1H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5zm0 9a2 2 0 110 4 2 2 0 010-4z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">הטופס אינו זמין</h2>
          <p className="text-sm text-neutral-500">טופס זה אינו מקבל תגובות כרגע.</p>
        </div>
      </div>
    )
  }

  // Date window check (Israel time, UTC+3)
  const nowIL = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const todayIL = nowIL.toISOString().slice(0, 10) // YYYY-MM-DD

  const startDate = form.settings?.submission_start_date
  const endDate = form.settings?.submission_end_date

  if (startDate && todayIL < startDate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6" dir="rtl">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-blue-400">
              <path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.995 13.7h.01M8.295 13.7h.01M8.295 16.7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">הטופס טרם נפתח</h2>
          <p className="text-sm text-neutral-500">
            הגשות יתאפשרו החל מ-{startDate.split("-").reverse().join("/")}
          </p>
        </div>
      </div>
    )
  }

  if (endDate && todayIL > endDate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6" dir="rtl">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
              <path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12l-6 6M9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">הטופס סגור</h2>
          <p className="text-sm text-neutral-500">
            המועד האחרון להגשה היה {endDate.split("-").reverse().join("/")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100" dir="rtl">
      <div className="px-4 pt-8 pb-32 sm:py-12 sm:pb-12 max-w-md mx-auto">

        {/* Unified form card — matches preview exactly */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">

          {/* Header — same border-b as preview */}
          <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
            <h1
              className="text-xl font-bold text-neutral-900"
              style={{ textAlign: form.settings?.title_align ?? "right" }}
            >
              {form.name}
            </h1>
            {form.description && (
              <div
                className="text-sm text-neutral-500 mt-1.5 leading-relaxed rich-text"
                dangerouslySetInnerHTML={{ __html: form.description }}
              />
            )}
          </div>

          {/* Fields */}
          <div className="px-6 py-5 space-y-5">
            {form.fields.length === 0 ? (
              <p className="text-center text-neutral-400 text-sm py-10">
                לטופס זה אין שדות עדיין.
              </p>
            ) : (
              <FormRenderer form={form} />
            )}
          </div>
        </div>

        {/* Branding */}
        {!form.settings?.hide_branding && (
          <p className="text-center text-xs text-neutral-400 mt-5">
            מופעל על ידי{" "}
            <span className="font-medium text-neutral-600">אמרל טפסים</span>
          </p>
        )}
      </div>
    </div>
  )
}
