import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormCard } from "@/components/dashboard/form-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { createClient } from "@/lib/supabase/server"
import { rowToForm } from "@/lib/types"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "לוח בקרה" }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFormsWithCounts(supabase: any, userId: string) {
  const { data: rows } = await supabase
    .from("forms")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (!rows || rows.length === 0) return []

  const formIds = rows.map((f: { id: string }) => f.id)

  const { data: counts } = await supabase
    .from("responses")
    .select("form_id")
    .in("form_id", formIds)

  const countMap: Record<string, number> = {}
  counts?.forEach((r: { form_id: string }) => {
    countMap[r.form_id] = (countMap[r.form_id] ?? 0) + 1
  })

  return rows.map((row: Record<string, unknown>) => ({
    form: rowToForm(row as Parameters<typeof rowToForm>[0]),
    responseCount: countMap[row.id as string] ?? 0,
  }))
}

export default async function DashboardPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const formsWithCounts = await getFormsWithCounts(sb, user.id)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                <rect x="3" y="3" width="18" height="4" rx="1" fill="currentColor" />
                <rect x="3" y="10" width="12" height="4" rx="1" fill="currentColor" opacity="0.7" />
                <rect x="3" y="17" width="8" height="4" rx="1" fill="currentColor" opacity="0.5" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-neutral-900">FormCraft</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 hidden sm:block" dir="ltr">{user.email}</span>
            <form
              action={async () => {
                "use server"
                const { createClient: create } = await import("@/lib/supabase/server")
                const client = await create()
                await client.auth.signOut()
                const { redirect: redir } = await import("next/navigation")
                redir("/login")
              }}
            >
              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="יציאה">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">הטפסים שלי</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {formsWithCounts.length === 0
                ? "אין טפסים עדיין"
                : `${formsWithCounts.length} ${formsWithCounts.length === 1 ? "טופס" : "טפסים"}`}
            </p>
          </div>

          {formsWithCounts.length > 0 && (
            <Button asChild className="rounded-xl gap-2 h-9">
              <Link href="/forms/new">
                <Plus className="h-4 w-4" />
                טופס חדש
              </Link>
            </Button>
          )}
        </div>

        {formsWithCounts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formsWithCounts.map(
              ({ form, responseCount }: { form: ReturnType<typeof rowToForm>; responseCount: number }) => (
                <FormCard key={form.id} form={form} responseCount={responseCount} />
              )
            )}
          </div>
        )}
      </main>
    </div>
  )
}
