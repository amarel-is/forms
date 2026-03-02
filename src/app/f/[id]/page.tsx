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
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="text-neutral-400"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9v1H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5zm0 9a2 2 0 110 4 2 2 0 010-4z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">הטופס אינו זמין</h2>
          <p className="text-sm text-neutral-500">טופס זה אינו מקבל תגובות כרגע.</p>
        </div>
      </div>
    )
  }

  return (
    /*
     * pb-safe: adds padding-bottom = env(safe-area-inset-bottom) on notch phones
     * The sticky submit button inside FormRenderer needs clearance from the home bar.
     */
    <div className="min-h-screen bg-neutral-50">
      {/* Scrollable content area — bottom padded so sticky button never overlaps */}
      <div className="px-4 pt-8 pb-32 sm:py-12 sm:pb-12 max-w-lg mx-auto">
        {/* Form header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-neutral-900 leading-snug">{form.name}</h1>
          {form.description && (
            <p className="text-neutral-500 mt-2 text-sm leading-relaxed">{form.description}</p>
          )}
        </div>

        {/* Fields card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6">
          {form.fields.length === 0 ? (
            <p className="text-center text-neutral-400 text-sm py-10">
              לטופס זה אין שדות עדיין.
            </p>
          ) : (
            <FormRenderer form={form} />
          )}
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-neutral-400 mt-5">
          מופעל על ידי{" "}
          <span className="font-medium text-neutral-600">FormCraft</span>
        </p>
      </div>
    </div>
  )
}
