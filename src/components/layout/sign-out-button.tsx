"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSignOut}
      className="h-8 w-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
      title="יציאה"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  )
}
