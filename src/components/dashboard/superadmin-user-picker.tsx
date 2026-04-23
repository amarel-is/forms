"use client"

import { useRouter } from "next/navigation"
import { Users } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SuperadminUserPickerProps {
  users: { id: string; email: string }[]
  selectedUserId: string
  currentUserId: string
}

export function SuperadminUserPicker({ users, selectedUserId, currentUserId }: SuperadminUserPickerProps) {
  const router = useRouter()

  function handleChange(userId: string) {
    const params = new URLSearchParams()
    if (userId !== currentUserId) params.set("userId", userId)
    const qs = params.toString()
    router.push(qs ? `/dashboard?${qs}` : "/dashboard")
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl mb-6">
      <Users className="h-4 w-4 text-orange-500 shrink-0" />
      <span className="text-xs font-medium text-orange-700 shrink-0">סופר אדמין — צפייה בטפסי:</span>
      <Select value={selectedUserId} onValueChange={handleChange}>
        <SelectTrigger className="h-8 flex-1 rounded-lg text-xs border-orange-200 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id} className="text-xs">
              {u.email}
              {u.id === currentUserId && " (אני)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
