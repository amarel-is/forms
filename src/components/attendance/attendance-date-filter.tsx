"use client"

import { useRouter } from "next/navigation"
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AttendanceDateFilterProps {
  selectedDate: string // YYYY-MM-DD
  formId: string
}

export function AttendanceDateFilter({
  selectedDate,
  formId,
}: AttendanceDateFilterProps) {
  const router = useRouter()
  const today = new Date().toISOString().split("T")[0]
  const isToday = selectedDate === today

  function navigate(days: number) {
    const d = new Date(selectedDate + "T12:00:00")
    d.setDate(d.getDate() + days)
    const iso = d.toISOString().split("T")[0]
    router.push(`/forms/${formId}/attendance?date=${iso}`)
  }

  function goToday() {
    router.push(`/forms/${formId}/attendance`)
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    router.push(`/forms/${formId}/attendance?date=${e.target.value}`)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Prev day */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigate(-1)}
        className="h-8 w-8 rounded-xl"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Date picker */}
      <div className="relative flex items-center">
        <CalendarDays className="absolute start-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={handleDateChange}
          className="h-8 ps-8 pe-3 text-xs rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          dir="ltr"
        />
      </div>

      {/* Next day */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigate(1)}
        disabled={isToday}
        className="h-8 w-8 rounded-xl"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Today shortcut */}
      {!isToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToday}
          className="h-8 text-xs rounded-xl"
        >
          היום
        </Button>
      )}
    </div>
  )
}
