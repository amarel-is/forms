"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export interface FormNotification {
  id: string
  form_id: string
  form_name: string
  response_id: string
  is_read: boolean
  created_at: string
}

interface UseFormNotificationsOptions {
  userId: string | null
  enabled?: boolean
}

export function useFormNotifications({
  userId,
  enabled = true,
}: UseFormNotificationsOptions) {
  const [notifications, setNotifications] = useState<FormNotification[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)

      if (!error && data) {
        setNotifications(data as FormNotification[])
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const markAsRead = useCallback(async (id: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }, [userId])

  // Initial fetch
  useEffect(() => {
    if (enabled && userId) {
      fetchNotifications()
    }
  }, [enabled, userId, fetchNotifications])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!enabled || !userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newNotif = payload.new as FormNotification
          setNotifications((prev) => [newNotif, ...prev])

          // Fire a toast notification
          toast("תגובה חדשה לטופס", {
            description: `הוגשה תגובה חדשה לטופס: ${newNotif.form_name}`,
            duration: 6000,
            action: {
              label: "צפה",
              onClick: () => {
                window.location.href = `/forms/${newNotif.form_id}/results`
              },
            },
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, userId])

  // Refresh on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userId) {
        fetchNotifications()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [userId, fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
