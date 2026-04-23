import { UserCog } from "lucide-react"
import { getImpersonationInfo } from "@/lib/actions/impersonate"
import { StopImpersonatingButton } from "./stop-impersonating-button"

export async function ImpersonationBanner() {
  const info = await getImpersonationInfo()
  if (!info.isImpersonating) return null

  return (
    <div className="sticky top-0 z-[60] bg-orange-600 text-white px-4 py-2 text-sm flex items-center justify-center gap-3 shadow-sm">
      <UserCog className="h-4 w-4 shrink-0" />
      <span className="font-medium">
        אתה מחובר כ־<span className="font-bold">{info.currentEmail ?? "?"}</span>
      </span>
      {info.adminEmail && (
        <span className="text-white/70 text-xs hidden sm:inline">
          (חשבון הניהול: {info.adminEmail})
        </span>
      )}
      <StopImpersonatingButton />
    </div>
  )
}
