"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Users, LogIn, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { startImpersonation } from "@/lib/actions/impersonate"

interface SuperadminUserPickerProps {
  users: { id: string; email: string }[]
  selectedUserId: string
  currentUserId: string
}

export function SuperadminUserPicker({ users, selectedUserId, currentUserId }: SuperadminUserPickerProps) {
  const router = useRouter()
  const [signingIn, setSigningIn] = useState(false)

  function handleChange(userId: string) {
    const params = new URLSearchParams()
    if (userId !== currentUserId) params.set("userId", userId)
    const qs = params.toString()
    router.push(qs ? `/dashboard?${qs}` : "/dashboard")
  }

  async function handleSignInAs() {
    if (selectedUserId === currentUserId) return
    setSigningIn(true)

    const result = await startImpersonation(selectedUserId)
    if (result.error || !result.token_hash) {
      toast.error(result.error ?? "אירעה שגיאה")
      setSigningIn(false)
      return
    }

    // Consume the magic-link token client-side to establish the new session cookies
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: result.token_hash,
    })
    if (error) {
      toast.error(error.message)
      setSigningIn(false)
      return
    }

    // Hard reload so the server reads the new session cookie
    window.location.href = "/dashboard"
  }

  const viewingSelf = selectedUserId === currentUserId
  const selectedUser = users.find((u) => u.id === selectedUserId)

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

      {!viewingSelf && (
        <Button
          size="sm"
          onClick={handleSignInAs}
          disabled={signingIn}
          className="h-8 rounded-lg text-xs bg-orange-600 hover:bg-orange-500 text-white border-0 gap-1.5 shrink-0"
          title={`התחבר כ־${selectedUser?.email ?? ""}`}
        >
          {signingIn ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogIn className="h-3.5 w-3.5" />
          )}
          התחבר כ־
        </Button>
      )}
    </div>
  )
}
