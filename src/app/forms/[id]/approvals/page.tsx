import { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowRight,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  Eye,
  Pencil,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AppHeader } from "@/components/layout/amarel-nav"
import { CopyLinkButton } from "@/components/results/copy-link-button"
import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/supabase/auth-context"
import { getResponseApprovalsByForm } from "@/lib/actions/approvals"
import {
  rowToForm,
  rowToResponse,
  isLayoutField,
  type ResponseApproval,
  type ApprovalStatus,
  type ApprovalStepStatus,
} from "@/lib/types"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filter?: string }>
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
  return { title: row?.name ? `סבב אישורים — ${row.name}` : "סבב אישורים" }
}

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; class: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "ממתין", class: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Hourglass },
  in_progress: { label: "בתהליך", class: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  approved: { label: "אושר", class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "נדחה", class: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  expired: { label: "פג תוקף", class: "bg-neutral-100 text-neutral-600 border-neutral-200", icon: Clock },
}

const STEP_STATUS_CONFIG: Record<ApprovalStepStatus, { label: string; class: string }> = {
  waiting: { label: "ממתין לתור", class: "bg-neutral-100 text-neutral-500" },
  pending: { label: "ממתין להחלטה", class: "bg-yellow-100 text-yellow-700" },
  approved: { label: "אושר", class: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "נדחה", class: "bg-red-100 text-red-700" },
  expired: { label: "פג תוקף", class: "bg-neutral-100 text-neutral-500" },
}

export default async function ApprovalsPage({ params, searchParams }: Props) {
  const { id } = await params
  const { filter } = await searchParams
  const { user, isSuperadmin, db: sb } = await getAuthContext()
  if (!user) redirect("/login")

  let formQuery = sb.from("forms").select("*").eq("id", id)
  if (!isSuperadmin) formQuery = formQuery.eq("user_id", user.id)
  const { data: formRow, error: formError } = await formQuery.single()

  if (formError || !formRow) notFound()

  const form = rowToForm(formRow)

  if (form.form_type !== "approval") notFound()

  const { data: responseRows } = await sb
    .from("responses")
    .select("*")
    .eq("form_id", id)
    .order("submitted_at", { ascending: false })

  const responses = (responseRows ?? []).map(rowToResponse)
  const { byResponseId } = await getResponseApprovalsByForm(id)

  const inputFields = form.fields.filter((f) => !isLayoutField(f.type))

  type EnrichedResponse = {
    id: string
    submitted_at: string
    data: Record<string, string | string[]>
    approval: ResponseApproval | null
  }

  const enriched: EnrichedResponse[] = responses.map((r: ReturnType<typeof rowToResponse>) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    data: r.data,
    approval: byResponseId[r.id] ?? null,
  }))

  const filtered = filter && filter !== "all"
    ? enriched.filter((r) => r.approval?.status === filter)
    : enriched

  const counts = {
    all: enriched.length,
    in_progress: enriched.filter((r) => r.approval?.status === "in_progress").length,
    approved: enriched.filter((r) => r.approval?.status === "approved").length,
    rejected: enriched.filter((r) => r.approval?.status === "rejected").length,
    pending: enriched.filter((r) => !r.approval || r.approval.status === "pending").length,
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader userId={user.id} userEmail={user.email ?? undefined} hasSubBar />

      {/* Breadcrumb sub-bar */}
      <div className="bg-[#1e3347] px-4 sm:px-6 pb-3">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#2D4458] rounded-2xl h-12 flex items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="sm" asChild className="h-7 rounded-lg gap-1 text-xs text-white/60 hover:text-white hover:bg-white/10 px-2">
                <Link href="/dashboard"><ArrowRight className="h-3.5 w-3.5" /> הטפסים שלי</Link>
              </Button>
              <span className="text-white/50 text-xs" aria-hidden>/</span>
              <span className="text-white/80 text-xs font-medium truncate max-w-[160px]">{form.name}</span>
              <Badge className="text-xs rounded-md shrink-0 border bg-emerald-500/20 text-emerald-300 border-emerald-400/30 px-1.5 py-0">
                <ClipboardCheck className="h-3 w-3 me-1" />
                אישורים
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="ghost" size="sm" asChild className="rounded-lg gap-1.5 h-7 text-xs text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex">
                <Link href={`/forms/${id}`}><Pencil className="h-3 w-3" /> ערוך</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="rounded-lg gap-1.5 h-7 text-xs text-white/70 hover:text-white hover:bg-white/10">
                <Link href={`/f/${id}`} target="_blank"><Eye className="h-3 w-3" /> תצוגה</Link>
              </Button>
              <CopyLinkButton formId={id} variant="ghost-dark" />
            </div>
          </div>
        </div>
      </div>

      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8" tabIndex={-1}>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
            <div className="text-2xl font-bold text-neutral-900">{counts.all}</div>
            <div className="text-xs text-neutral-500 mt-0.5">סה״כ בקשות</div>
          </div>
          <div className="bg-white rounded-2xl border border-blue-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{counts.in_progress}</div>
            <div className="text-xs text-blue-600 mt-0.5">בתהליך</div>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-200 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{counts.approved}</div>
            <div className="text-xs text-emerald-600 mt-0.5">אושרו</div>
          </div>
          <div className="bg-white rounded-2xl border border-red-200 p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{counts.rejected}</div>
            <div className="text-xs text-red-600 mt-0.5">נדחו</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: "all", label: "הכל", count: counts.all },
            { key: "in_progress", label: "בתהליך", count: counts.in_progress },
            { key: "approved", label: "אושרו", count: counts.approved },
            { key: "rejected", label: "נדחו", count: counts.rejected },
          ] as const).map((tab) => {
            const active = (filter ?? "all") === tab.key
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? `/forms/${id}/approvals` : `/forms/${id}/approvals?filter=${tab.key}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  active
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {tab.label} ({tab.count})
              </Link>
            )
          })}
        </div>

        <Separator />

        {/* Request cards */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-400 text-sm">
            {filter && filter !== "all" ? "אין בקשות בסטטוס זה" : "עדיין אין בקשות"}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const approval = item.approval
              const status = approval?.status ?? "pending"
              const config = STATUS_CONFIG[status]
              const StatusIcon = config.icon
              const steps = approval?.steps ?? []
              const currentIdx = approval?.current_step_index ?? 0

              const summaryFields = inputFields.slice(0, 3)

              return (
                <details key={item.id} className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                  <summary className="flex items-center gap-4 p-5 cursor-pointer hover:bg-neutral-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    {/* Status icon */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${config.class}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    {/* Quick summary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs rounded-md border ${config.class}`}>{config.label}</Badge>
                        {steps.length > 0 && (
                          <span className="text-xs text-neutral-500">
                            שלב {Math.min(currentIdx + 1, steps.length)}/{steps.length}
                          </span>
                        )}
                        <span className="text-xs text-neutral-400">
                          {new Date(item.submitted_at).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-600">
                        {summaryFields.map((f) => {
                          const val = item.data[f.id]
                          if (!val) return null
                          return (
                            <span key={f.id} className="truncate max-w-[140px]">
                              <span className="text-neutral-400">{f.label}: </span>
                              {Array.isArray(val) ? val.join(", ") : val}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Current approver */}
                    {status === "in_progress" && steps[currentIdx] && (
                      <div className="hidden sm:flex items-center gap-2 shrink-0 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                        <User className="h-3.5 w-3.5" />
                        <span>ממתין ל: <strong>{steps[currentIdx].approver_name}</strong></span>
                      </div>
                    )}

                    {/* Toggle */}
                    <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0 group-open:hidden" />
                    <ChevronUp className="h-4 w-4 text-neutral-400 shrink-0 hidden group-open:block" />
                  </summary>

                  {/* Expanded detail */}
                  <div className="px-5 pb-5 border-t border-neutral-100 pt-4 space-y-4">

                    {/* Step timeline */}
                    <div>
                      <h3 className="text-xs font-semibold text-neutral-600 mb-3">שלבי אישור</h3>
                      <div className="space-y-0">
                        {steps.map((step, idx) => {
                          const stepConfig = STEP_STATUS_CONFIG[step.status]
                          const isActive = step.status === "pending"
                          const isDone = step.status === "approved" || step.status === "rejected"
                          return (
                            <div key={step.id} className="flex items-start gap-3">
                              {/* Timeline connector */}
                              <div className="flex flex-col items-center shrink-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                  isDone && step.status === "approved"
                                    ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                                    : isDone && step.status === "rejected"
                                    ? "bg-red-100 border-red-400 text-red-700"
                                    : isActive
                                    ? "bg-blue-100 border-blue-400 text-blue-700 ring-2 ring-blue-200"
                                    : "bg-neutral-100 border-neutral-300 text-neutral-400"
                                }`}>
                                  {isDone && step.status === "approved" ? "✓" : isDone && step.status === "rejected" ? "✗" : idx + 1}
                                </div>
                                {idx < steps.length - 1 && (
                                  <div className={`w-0.5 h-10 ${isDone ? "bg-emerald-300" : "bg-neutral-200"}`} />
                                )}
                              </div>

                              {/* Step content */}
                              <div className={`flex-1 pb-4 ${idx < steps.length - 1 ? "" : ""}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-neutral-800">{step.approver_name || `מאשר ${idx + 1}`}</span>
                                  <Badge className={`text-[10px] rounded-md ${stepConfig.class}`}>{stepConfig.label}</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-neutral-500">
                                  <span className="flex items-center gap-1">
                                    {step.approver_channel === "email"
                                      ? <Mail className="h-3 w-3" />
                                      : <MessageSquare className="h-3 w-3" />}
                                    {step.approver_target}
                                  </span>
                                  {step.acted_at && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(step.acted_at).toLocaleDateString("he-IL", {
                                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                                {step.decision_note && (
                                  <p className="mt-1.5 text-xs text-neutral-600 bg-neutral-50 rounded-lg p-2 border border-neutral-200">
                                    {step.decision_note}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Full response data */}
                    <div>
                      <h3 className="text-xs font-semibold text-neutral-600 mb-3">פרטי הבקשה</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {inputFields.map((f) => {
                          const val = item.data[f.id]
                          if (val === undefined) return null
                          return (
                            <div key={f.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                              <p className="text-[11px] text-neutral-500 mb-0.5">{f.label || f.id}</p>
                              <p className="text-sm text-neutral-800 break-words">
                                {Array.isArray(val) ? val.join(", ") : val || "—"}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
