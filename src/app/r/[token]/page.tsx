import { Metadata } from "next"
import { Lock, LinkIcon, CalendarX } from "lucide-react"
import { getShareView } from "@/lib/share-links"
import { SharePasswordForm } from "./password-form"
import { ShareResultsView } from "./share-results-view"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const view = await getShareView(token, { countView: false })
  return {
    title: view.status === "ok" || view.status === "locked" ? view.name : "שיתוף תוצאות",
    robots: { index: false, follow: false },
  }
}

function StateScreen({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
        {icon}
      </div>
      <h1 className="text-lg font-bold text-neutral-900 mb-1">{title}</h1>
      <p className="text-sm text-neutral-500">{body}</p>
    </div>
  )
}

export default async function ShareResultsPage({ params }: Props) {
  const { token } = await params
  const view = await getShareView(token, { countView: true })

  return (
    <div className="min-h-screen bg-neutral-100" dir="rtl">
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {view.status === "not_found" && (
          <StateScreen
            icon={<LinkIcon className="h-6 w-6" />}
            title="הקישור לא נמצא"
            body="ייתכן שהקישור נמחק או שהכתובת שגויה."
          />
        )}
        {view.status === "inactive" && (
          <StateScreen
            icon={<Lock className="h-6 w-6" />}
            title="הקישור אינו פעיל"
            body="בעל הטופס השבית את הקישור הזה. לקבלת גישה, פנו אליו ישירות."
          />
        )}
        {view.status === "expired" && (
          <StateScreen
            icon={<CalendarX className="h-6 w-6" />}
            title="תוקף הקישור פג"
            body="הקישור כבר לא זמין. לקבלת גישה מחודשת, פנו לבעל הטופס."
          />
        )}
        {view.status === "locked" && <SharePasswordForm token={token} name={view.name} />}
        {view.status === "ok" && <ShareResultsView view={view} />}
        <p className="text-center text-[11px] text-neutral-400 mt-6">מופעל על ידי אמרל טפסים</p>
      </main>
    </div>
  )
}
