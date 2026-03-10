import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import {
  FileText,
  Globe,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  ExternalLink,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AppHeader } from "@/components/layout/amarel-nav"
import { ResponsesOverTimeChart } from "@/components/analytics/responses-over-time-chart"
import { FormsLeaderboard } from "@/components/analytics/forms-leaderboard"
import { DayOfWeekChart } from "@/components/analytics/day-of-week-chart"
import { DateRangeFilter } from "@/components/analytics/date-range-filter"
import { createClient } from "@/lib/supabase/server"
import { rowToForm, rowToResponse } from "@/lib/types"
import {
  computeKPIs,
  buildTimeSeries,
  buildFormStats,
  buildDayOfWeekStats,
} from "@/lib/analytics"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "אנליטיקס" }

interface Props {
  searchParams: Promise<{ days?: string; form?: string }>
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent?: "blue" | "orange" | "green" | "neutral"
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    neutral: "bg-neutral-100 text-neutral-500",
  }
  const bg = colors[accent ?? "neutral"]

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-neutral-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { days: daysParam } = await searchParams
  const days = parseInt(daysParam ?? "30", 10)
  const validDays = [7, 14, 30, 90].includes(days) ? days : 30

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch all forms
  const { data: formRows } = await sb
    .from("forms")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forms = (formRows ?? []).map((f: any) => rowToForm(f))

  // Date window
  const since = new Date()
  since.setDate(since.getDate() - validDays)
  since.setHours(0, 0, 0, 0)

  // Fetch responses in window
  const formIds = forms.map((f: ReturnType<typeof rowToForm>) => f.id)
  let responses: ReturnType<typeof rowToResponse>[] = []

  if (formIds.length > 0) {
    const { data: respRows } = await sb
      .from("responses")
      .select("*")
      .in("form_id", formIds)
      .gte("submitted_at", since.toISOString())
      .order("submitted_at", { ascending: true })

    responses = (respRows ?? []).map(rowToResponse)
  }

  // All-time response counts per form (for the bar chart)
  let allTimeResponses: ReturnType<typeof rowToResponse>[] = []
  if (formIds.length > 0) {
    const { data: allRows } = await sb
      .from("responses")
      .select("id, form_id, submitted_at")
      .in("form_id", formIds)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allTimeResponses = (allRows ?? []).map((r: any) => rowToResponse(r))
  }

  const kpis = computeKPIs(forms, allTimeResponses)
  const timeSeries = buildTimeSeries(responses, validDays)
  const formStats = buildFormStats(forms, allTimeResponses)
  const dayOfWeek = buildDayOfWeekStats(responses)

  const windowLabel =
    validDays === 7
      ? "7 הימים האחרונים"
      : validDays === 14
      ? "14 הימים האחרונים"
      : validDays === 30
      ? "30 הימים האחרונים"
      : "90 הימים האחרונים"

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader userId={user.id} userEmail={user.email ?? undefined} activePath="analytics" />

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8" tabIndex={-1}>

        {/* Page header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">אנליטיקס</h1>
            <p className="text-sm text-neutral-500 mt-0.5">{windowLabel}</p>
          </div>
          <Suspense>
            <DateRangeFilter current={String(validDays)} />
          </Suspense>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="טפסים"
            value={kpis.totalForms}
            icon={<FileText className="h-5 w-5" />}
            accent="neutral"
          />
          <KpiCard
            label="פורסמו"
            value={kpis.publishedForms}
            sub={`מתוך ${kpis.totalForms}`}
            icon={<Globe className="h-5 w-5" />}
            accent="green"
          />
          <KpiCard
            label="סה״כ תגובות"
            value={kpis.totalResponses}
            icon={<MessageSquare className="h-5 w-5" />}
            accent="blue"
          />
          <KpiCard
            label="היום"
            value={kpis.responsesToday}
            icon={<Clock className="h-5 w-5" />}
            accent="orange"
          />
          <KpiCard
            label="השבוע"
            value={kpis.responsesThisWeek}
            icon={<Calendar className="h-5 w-5" />}
            accent="blue"
          />
          <KpiCard
            label="ממוצע לטופס"
            value={kpis.avgResponsesPerForm}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="neutral"
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Responses over time — wide */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">תגובות לאורך זמן</h2>
                <p className="text-xs text-neutral-400 mt-0.5">{windowLabel}</p>
              </div>
              <BarChart3 className="h-4 w-4 text-neutral-300" />
            </div>
            <ResponsesOverTimeChart data={timeSeries} />
          </div>

          {/* Day of week */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">לפי יום בשבוע</h2>
                <p className="text-xs text-neutral-400 mt-0.5">{windowLabel}</p>
              </div>
              <Calendar className="h-4 w-4 text-neutral-300" />
            </div>
            <DayOfWeekChart data={dayOfWeek} />
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Per-form leaderboard */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">תגובות לפי טופס</h2>
                <p className="text-xs text-neutral-400 mt-0.5">כל הזמן • לידרבורד לפי סה״כ תגובות</p>
              </div>
            </div>
            <FormsLeaderboard data={formStats} />
          </div>

          {/* Forms table */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-4">פירוט טפסים</h2>

            {formStats.length === 0 ? (
              <p className="text-sm text-neutral-400 py-8 text-center">אין טפסים</p>
            ) : (
              <div className="space-y-2">
                {formStats.map((f, i) => (
                  <div key={f.id}>
                    {i > 0 && <Separator className="my-2" />}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-300 w-5 shrink-0 text-center font-mono">
                        {i + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-neutral-800 truncate">
                            {f.name}
                          </p>
                          {f.form_type === "attendance" && (
                            <Users className="h-3 w-3 text-orange-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {f.today > 0 ? `${f.today} היום · ` : ""}
                          {f.total} סה״כ
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={`text-xs rounded-lg px-2 py-0 border ${
                            f.published
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-neutral-50 text-neutral-400 border-neutral-200"
                          }`}
                        >
                          {f.published ? "מפורסם" : "טיוטה"}
                        </Badge>
                        <Link
                          href={`/forms/${f.id}/results`}
                          className="text-neutral-300 hover:text-neutral-600 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        {allTimeResponses.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-4">
              פעילות אחרונה
              <span className="text-xs font-normal text-neutral-400 me-2">
                (10 תגובות אחרונות)
              </span>
            </h2>

            <div className="space-y-0">
              {[...allTimeResponses]
                .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                .slice(0, 10)
                .map((r, i) => {
                  const form = forms.find((f: ReturnType<typeof rowToForm>) => f.id === r.form_id)
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 py-2.5 ${
                        i < 9 ? "border-b border-neutral-50" : ""
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-700 truncate">
                          תגובה חדשה לטופס{" "}
                          <span className="font-medium">{form?.name ?? "לא ידוע"}</span>
                        </p>
                      </div>
                      <span className="text-xs text-neutral-400 shrink-0">
                        {new Date(r.submitted_at).toLocaleDateString("he-IL", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
