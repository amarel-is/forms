import { Metadata } from "next"
import { notFound } from "next/navigation"
import { FormRenderer } from "@/components/form-renderer/form-renderer"
import { FormStyle, FORM_ROOT_ID } from "@/components/form-renderer/form-style"
import { createClient } from "@/lib/supabase/server"
import { rowToForm } from "@/lib/types"
import { EmbedResizer } from "./embed-resizer"

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

export default async function EmbedFormPage({ params }: Props) {
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
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-neutral-500">הטופס אינו זמין</p>
      </div>
    )
  }

  const hideBranding = form.settings?.hide_branding === true

  return (
    <div id={FORM_ROOT_ID} className="bg-transparent" dir="rtl">
      <FormStyle css={form.settings?.custom_css} />
      <div className="max-w-md mx-auto">
        <div data-form-card className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div data-form-header className="px-6 pt-6 pb-4 border-b border-neutral-100">
            <h1
              data-form-title
              className="text-xl font-bold text-neutral-900"
              style={{ textAlign: form.settings?.title_align ?? "right" }}
            >
              {form.name}
            </h1>
            {form.description && (
              <div
                data-form-description
                className="text-sm text-neutral-500 mt-1.5 leading-relaxed rich-text"
                dangerouslySetInnerHTML={{ __html: form.description }}
              />
            )}
          </div>

          <div data-form-body className="px-6 py-5 space-y-5">
            {form.fields.length === 0 ? (
              <p className="text-center text-neutral-400 text-sm py-10">
                לטופס זה אין שדות עדיין.
              </p>
            ) : (
              <FormRenderer form={form} />
            )}
          </div>
        </div>

        {!hideBranding && (
          <p className="text-center text-xs text-neutral-400 mt-4 pb-2">
            מופעל על ידי{" "}
            <span className="font-medium text-neutral-600">אמרל טפסים</span>
          </p>
        )}
      </div>
      <EmbedResizer />
    </div>
  )
}
