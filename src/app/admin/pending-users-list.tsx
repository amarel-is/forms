"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Check, X, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { approveUser, rejectUser, type PendingUser } from "@/lib/actions/auth"

export function PendingUsersList({ initialUsers }: { initialUsers: PendingUser[] }) {
  const [users, setUsers] = useState<PendingUser[]>(initialUsers)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleApprove(u: PendingUser) {
    setBusyId(u.id)
    const res = await approveUser(u.id)
    setBusyId(null)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setUsers((prev) => prev.filter((x) => x.id !== u.id))
    toast.success(`${u.full_name || u.email} אושר/ה`)
  }

  async function handleReject(u: PendingUser) {
    if (!confirm(`לדחות ולמחוק את בקשת ההרשמה של ${u.full_name || u.email}?`)) return
    setBusyId(u.id)
    const res = await rejectUser(u.id)
    setBusyId(null)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setUsers((prev) => prev.filter((x) => x.id !== u.id))
    toast.success("הבקשה נדחתה")
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
          <UserCheck className="w-6 h-6 text-neutral-400" />
        </div>
        <p className="text-sm text-neutral-500">אין בקשות הרשמה ממתינות.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {users.map((u) => {
        const busy = busyId === u.id
        return (
          <div
            key={u.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-neutral-900">{u.full_name || "—"}</span>
                {u.division && (
                  <span className="text-[11px] bg-neutral-100 text-neutral-600 rounded-md px-1.5 py-0.5">
                    {u.division}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 mt-0.5" dir="ltr">{u.email}</p>
              {u.role && <p className="text-xs text-neutral-400 mt-0.5">{u.role}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => handleApprove(u)}
                disabled={busy}
                className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                אשר
              </Button>
              <Button
                onClick={() => handleReject(u)}
                disabled={busy}
                variant="outline"
                className="h-9 rounded-xl gap-1.5 text-red-600 hover:bg-red-50 border-red-200"
              >
                <X className="h-4 w-4" />
                דחה
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
