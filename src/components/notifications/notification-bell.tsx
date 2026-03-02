"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck, FileText, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useFormNotifications } from "@/hooks/use-form-notifications"

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useFormNotifications({ userId, enabled: true })

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
  }

  function handleNotificationClick(id: string) {
    markAsRead(id)
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMin / 60)

    if (diffMin < 1) return "עכשיו"
    if (diffMin < 60) return `לפני ${diffMin} דק׳`
    if (diffHrs < 24) return `לפני ${diffHrs} שע׳`
    return date.toLocaleDateString("he-IL", { month: "short", day: "numeric" })
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen} dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-white/80 hover:text-white hover:bg-white/10 focus-visible:ring-white/30"
        >
          <Bell className="h-4.5 w-4.5" />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute top-1 end-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-2xl p-0 shadow-xl border border-neutral-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-semibold text-neutral-800">התראות</span>
            {unreadCount > 0 && (
              <span className="bg-[#f97316] text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1 text-xs text-[hsl(221_83%_53%)] hover:underline font-medium"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              סמן הכל כנקרא
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
              <Bell className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">אין התראות</p>
            </div>
          ) : (
            notifications.map((notif, i) => (
              <div key={notif.id}>
                <Link
                  href={`/forms/${notif.form_id}/results`}
                  onClick={() => {
                    handleNotificationClick(notif.id)
                    setOpen(false)
                  }}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 cursor-pointer ${
                    !notif.is_read ? "bg-blue-50/40" : ""
                  }`}
                >
                  {/* Color dot */}
                  <span
                    className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${
                      notif.is_read ? "bg-neutral-300" : "bg-[hsl(221_83%_53%)]"
                    }`}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 justify-between">
                      <p className="text-sm font-medium text-neutral-800 leading-snug truncate">
                        תגובה חדשה
                      </p>
                      <span className="text-xs text-neutral-400 shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1 truncate">
                      <FileText className="h-3 w-3 shrink-0" />
                      {notif.form_name}
                    </p>
                  </div>
                </Link>
                {i < notifications.length - 1 && (
                  <Separator className="mx-4 w-auto" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
