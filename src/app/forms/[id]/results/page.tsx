import { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowRight, BarChart2, ExternalLink, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ResponsesTable } from "@/components/results/responses-table"
import { FieldStats } from "@/components/results/field-stats"
import { CopyLinkButton } from "@/components/results/copy-link-button"
import { AppHeader } from "@/components/layout/amarel-nav"
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
      {/* Full Amarel header with nav */}
      <AppHeader userId={user.id} userEmail={user.email ?? undefined} />

      {/* Breadcrumb sub-bar */}
      <div className="bg-[#243b50] border-b border-[rgba(148,163,184,0.15)] px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-11 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" asChild className="h-7 rounded-lg gap-1 text-xs text-white/60 hover:text-white hover:bg-white/10 px-2">
              <Link href="/dashboard"><ArrowRight className="h-3.5 w-3.5" /> הטפסים שלי</Link>
            </Button>
            <span className="text-white/30 text-xs">/</span>
            <span className="text-white/80 text-xs font-medium truncate max-w-[180px]">{form.name}</span>
            <Badge className={`text-xs rounded-md shrink-0 border px-1.5 py-0 ${form.is_published ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-white/10 text-white/50 border-white/20"}`}>
              {form.is_published ? "מפורסם" : "טיוטה"}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {form.form_type === "attendance" && (
              <Button variant="ghost" size="sm" asChild className="rounded-lg gap-1.5 h-7 text-xs text-white/70 hover:text-white hover:bg-white/10">
                <Link href={`/forms/${id}/attendance`}>
                  <Users className="h-3 w-3" />
                  נוכחות
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="rounded-lg gap-1.5 h-7 text-xs text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex">
              <Link href={`/forms/${id}`}>
                <BarChart2 className="h-3 w-3" />
                ערוך
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="rounded-lg gap-1.5 h-7 text-xs text-white/70 hover:text-white hover:bg-white/10">
              <Link href={`/f/${id}`} target="_blank">
                <ExternalLink className="h-3 w-3" />
                תצוגה
              </Link>
            </Button>
            <CopyLinkButton formId={id} />
          </div>
        </div>
      </div>

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
