import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormCard } from "@/components/dashboard/form-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { AppHeader } from "@/components/layout/amarel-nav"
import { createClient } from "@/lib/supabase/server"
import { rowToForm } from "@/lib/types"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "הטפסים שלי" }

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
      <AppHeader
        userId={user.id}
        userEmail={user.email ?? undefined}
        activePath="dashboard"
      />

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
            <Button
              asChild
              className="rounded-xl gap-2 h-9 bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-sm"
            >
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
