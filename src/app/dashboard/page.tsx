import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { SuperadminUserPicker } from "@/components/dashboard/superadmin-user-picker"
import { AppHeader } from "@/components/layout/amarel-nav"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUsers } from "@/lib/actions/admin"
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const isSuperadmin = user.user_metadata?.superadmin === true
  const { userId: queryUserId } = await searchParams
  const viewingUserId = isSuperadmin && queryUserId ? queryUserId : user.id

  // Superadmin viewing another user's forms — use admin client to bypass RLS
  const queryClient = isSuperadmin && viewingUserId !== user.id
    ? createAdminClient()
    : supabase

  const [formsWithCounts, users] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFormsWithCounts(queryClient as any, viewingUserId),
    isSuperadmin ? getUsers() : Promise.resolve([]),
  ])

  const viewingEmail = isSuperadmin && viewingUserId !== user.id
    ? (users.find((u) => u.id === viewingUserId)?.email ?? viewingUserId)
    : null

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader
        userId={user.id}
        userEmail={user.email ?? undefined}
        activePath="dashboard"
      />

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8" tabIndex={-1}>
        {isSuperadmin && (
          <SuperadminUserPicker
            users={users}
            selectedUserId={viewingUserId}
            currentUserId={user.id}
          />
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {viewingEmail ? `טפסים של ${viewingEmail}` : "הטפסים שלי"}
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {formsWithCounts.length === 0
                ? "אין טפסים עדיין"
                : `${formsWithCounts.length} ${formsWithCounts.length === 1 ? "טופס" : "טפסים"}`}
            </p>
          </div>

          {formsWithCounts.length > 0 && !viewingEmail && (
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
          <DashboardContent formsWithCounts={formsWithCounts} />
        )}
      </main>
    </div>
  )
}
