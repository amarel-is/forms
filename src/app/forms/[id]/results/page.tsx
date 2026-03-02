import { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowRight, BarChart2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ResponsesTable } from "@/components/results/responses-table"
import { FieldStats } from "@/components/results/field-stats"
import { CopyLinkButton } from "@/components/results/copy-link-button"
import { createClient } from "@/lib/supabase/server"
import { rowToForm, rowToResponse } from "@/lib/types"

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
    .select("name")
    .eq("id", id)
    .single()
  return { title: row?.name ? `תוצאות — ${row.name}` : "תוצאות" }
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: formRow, error: formError } = await sb
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (formError || !formRow) notFound()

  const form = rowToForm(formRow)

  const { data: responseRows } = await sb
    .from("responses")
    .select("*")
    .eq("form_id", id)
    .order("submitted_at", { ascending: false })

  const responses = (responseRows ?? []).map(rowToResponse)
  const lastResponse = responses.length > 0 ? responses[0].submitted_at : null

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* ArrowRight = "back" in RTL */}
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg shrink-0">
              <Link href="/dashboard">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-sm font-semibold text-neutral-900 truncate">{form.name}</h1>
              <Badge
                variant={form.is_published ? "default" : "secondary"}
                className="text-xs rounded-lg shrink-0"
              >
                {form.is_published ? "מפורסם" : "טיוטה"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild className="rounded-xl gap-1.5 h-8 text-xs hidden sm:flex">
              <Link href={`/forms/${id}`}>
                <BarChart2 className="h-3.5 w-3.5" />
                ערוך טופס
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="rounded-xl gap-1.5 h-8 text-xs">
              <Link href={`/f/${id}`} target="_blank">
                <ExternalLink className="h-3.5 w-3.5" />
                תצוגה מקדימה
              </Link>
            </Button>
            <CopyLinkButton formId={id} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
            <div className="text-2xl font-bold text-neutral-900">{responses.length}</div>
            <div className="text-xs text-neutral-500 mt-0.5">סה״כ תגובות</div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
            <div className="text-2xl font-bold text-neutral-900">{form.fields.length}</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              {form.fields.length === 1 ? "שדה" : "שדות"}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
            <div className="text-sm font-semibold text-neutral-900">
              {lastResponse
                ? new Date(lastResponse).toLocaleDateString("he-IL", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">תגובה אחרונה</div>
          </div>
        </div>

        {/* Field stats */}
        {responses.length > 0 && (
          <>
            <div>
              <h2 className="text-sm font-semibold text-neutral-700 mb-4">סיכום</h2>
              <FieldStats fields={form.fields} responses={responses} />
            </div>
            <Separator />
          </>
        )}

        {/* Table */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">כל התגובות</h2>
          <ResponsesTable fields={form.fields} responses={responses} />
        </div>
      </main>
    </div>
  )
}
