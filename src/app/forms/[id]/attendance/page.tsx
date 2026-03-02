import { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowRight,
  Users,
  UserCheck,
  UserX,
  Clock,
  Download,
  ExternalLink,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AppHeader } from "@/components/layout/amarel-nav"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { rowToForm, rowToResponse, computePresence } from "@/lib/types"
import { CopyLinkButton } from "@/components/results/copy-link-button"
import { AttendanceDateFilter } from "@/components/attendance/attendance-date-filter"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
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
  return { title: row?.name ? `נוכחות — ${row.name}` : "לוח נוכחות" }
}

export default async function AttendancePage({ params, searchParams }: Props) {
  const { id } = await params
  const { date: dateParam } = await searchParams
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

  // Date range
  const selectedDate = dateParam ?? new Date().toISOString().split("T")[0]
  const dayStart = `${selectedDate}T00:00:00.000Z`
  const dayEnd = `${selectedDate}T23:59:59.999Z`
  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  // Responses for the selected date
  const { data: dayRows } = await sb
    .from("responses")
    .select("*")
    .eq("form_id", id)
    .gte("submitted_at", dayStart)
    .lte("submitted_at", dayEnd)
    .order("submitted_at", { ascending: false })

  const dayResponses = (dayRows ?? []).map(rowToResponse)

  // All today's responses for presence computation
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { data: todayRows } = await sb
    .from("responses")
    .select("*")
    .eq("form_id", id)
    .gte("submitted_at", todayStart.toISOString())
    .order("submitted_at", { ascending: false })

  const todayResponses = (todayRows ?? []).map(rowToResponse)
  const presence = computePresence(todayResponses, form)
  const inOffice = presence.filter((p) => p.direction === "כניסה")
  const outOffice = presence.filter((p) => p.direction === "יציאה")

  // Field meta
  const nameField = form.fields.find((f) => f.attendance_role === "name")
  const idField = form.fields.find((f) => f.attendance_role === "id_number")
  const divField = form.fields.find((f) => f.attendance_role === "division")
  const dirField = form.fields.find((f) => f.attendance_role === "direction")

  function getFieldValue(r: ReturnType<typeof rowToResponse>, fieldId?: string) {
    if (!fieldId) return "—"
    return (r.data[fieldId] as string) || "—"
  }

  type DayResponse = ReturnType<typeof rowToResponse>

  const formattedSelectedDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Full Amarel header */}
      <AppHeader userId={user.id} userEmail={user.email ?? undefined} />

      {/* Breadcrumb sub-bar */}
      <div className="bg-[#243b50] border-b border-[rgba(148,163,184,0.15)] px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-11 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" asChild className="h-7 rounded-lg gap-1 text-xs text-white/60 hover:text-white hover:bg-white/10 px-2">
              <Link href="/dashboard"><ArrowRight className="h-3.5 w-3.5" /> הטפסים שלי</Link>
            </Button>
            <span className="text-white/30 text-xs">/</span>
            <span className="text-white/80 text-xs font-medium truncate max-w-[160px]">{form.name}</span>
            <Badge className="text-xs rounded-md shrink-0 border bg-white/10 text-white/70 border-white/20 px-1.5 py-0">
              <Users className="h-3 w-3 me-1" />
              נוכחות
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" asChild className="rounded-lg gap-1.5 h-7 text-xs text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex">
              <Link href={`/forms/${id}`}><Pencil className="h-3 w-3" /> ערוך</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="rounded-lg gap-1.5 h-7 text-xs text-white/70 hover:text-white hover:bg-white/10">
              <Link href={`/f/${id}`} target="_blank"><ExternalLink className="h-3 w-3" /> פתח</Link>
            </Button>
            <CopyLinkButton formId={id} />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Live presence — today only */}
        {isToday && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-neutral-700">נוכחים עכשיו במשרד</h2>
              <span className="text-xs text-neutral-400">({inOffice.length} אנשים)</span>
            </div>

            {inOffice.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-400 text-sm">
                אין נוכחים במשרד כרגע
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {inOffice.map((p) => (
                  <div
                    key={p.id_number}
                    className="bg-white rounded-2xl border border-green-200 p-4 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-lg">
                        במשרד
                      </span>
                      <UserCheck className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="font-semibold text-sm text-neutral-900 truncate">{p.name || "—"}</p>
                    <p className="text-xs text-neutral-500">{p.division || "—"}</p>
                    <div className="flex items-center gap-1 text-xs text-neutral-400">
                      <Clock className="h-3 w-3" />
                      {new Date(p.submitted_at).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {outOffice.length > 0 && (
              <p className="text-xs text-neutral-400">
                {outOffice.length} אנשים יצאו היום
              </p>
            )}

            <Separator />
          </div>
        )}

        {/* Date filter + log */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-700">יומן דיווחים</h2>
              <p className="text-xs text-neutral-400 mt-0.5">{formattedSelectedDate}</p>
            </div>
            <AttendanceDateFilter selectedDate={selectedDate} formId={id} />
          </div>

          {dayResponses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-400 text-sm">
              אין דיווחים בתאריך זה
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold text-neutral-500 w-28 text-right">שעה</TableHead>
                    {nameField && (
                      <TableHead className="text-xs font-semibold text-neutral-500 text-right">שם</TableHead>
                    )}
                    {idField && (
                      <TableHead className="text-xs font-semibold text-neutral-500 hidden sm:table-cell text-right">
                        ת.ז
                      </TableHead>
                    )}
                    {divField && (
                      <TableHead className="text-xs font-semibold text-neutral-500 hidden md:table-cell text-right">
                        חטיבה
                      </TableHead>
                    )}
                    {dirField && (
                      <TableHead className="text-xs font-semibold text-neutral-500 w-24 text-right">
                        סטטוס
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayResponses.map((r: DayResponse) => {
                    const dir = dirField ? (r.data[dirField.id] as string) : undefined
                    const isEntry = dir === "כניסה"
                    return (
                      <TableRow key={r.id} className="hover:bg-neutral-50">
                        <TableCell className="text-xs text-neutral-500 font-mono text-right">
                          {new Date(r.submitted_at).toLocaleTimeString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        {nameField && (
                          <TableCell className="text-sm font-medium text-neutral-800 text-right">
                            {getFieldValue(r, nameField.id)}
                          </TableCell>
                        )}
                        {idField && (
                          <TableCell className="text-xs text-neutral-500 hidden sm:table-cell text-right" dir="ltr">
                            {getFieldValue(r, idField.id)}
                          </TableCell>
                        )}
                        {divField && (
                          <TableCell className="text-xs text-neutral-600 hidden md:table-cell text-right">
                            {getFieldValue(r, divField.id)}
                          </TableCell>
                        )}
                        {dirField && (
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                isEntry
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {isEntry ? (
                                <UserCheck className="h-3 w-3" />
                              ) : (
                                <UserX className="h-3 w-3" />
                              )}
                              {dir || "—"}
                            </span>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary row */}
          {dayResponses.length > 0 && (
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
              <span>{dayResponses.length} דיווחים</span>
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-medium">
                  {dayResponses.filter((r: DayResponse) => dirField && r.data[dirField.id] === "כניסה").length} כניסות
                </span>
                <span className="text-red-500 font-medium">
                  {dayResponses.filter((r: DayResponse) => dirField && r.data[dirField.id] === "יציאה").length} יציאות
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Export hint */}
        <div className="flex items-center justify-between bg-neutral-100 rounded-2xl px-5 py-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">ייצוא דוח</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              לייצוא נתוני הנוכחות לקובץ, גש לדף <Link href={`/forms/${id}/results`} className="underline">תוצאות</Link>
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-xl gap-1.5">
            <Link href={`/forms/${id}/results`}>
              <Download className="h-3.5 w-3.5" />
              תוצאות
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
