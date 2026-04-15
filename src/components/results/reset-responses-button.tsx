"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteAllResponses } from "@/lib/actions/responses"

interface ResetResponsesButtonProps {
  formId: string
  responseCount: number
}

export function ResetResponsesButton({ formId, responseCount }: ResetResponsesButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleReset() {
    startTransition(async () => {
      const result = await deleteAllResponses(formId)
      if (!result.error) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-neutral-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          איפוס הגשות
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת כל ההגשות</AlertDialogTitle>
          <AlertDialogDescription>
            פעולה זו תמחק את כל {responseCount > 0 ? `${responseCount} ` : ""}ההגשות של הטופס לצמיתות.
            <br />
            השתמש בזה לניקוי הגשות בדיקה לפני שהטופס יוצא לשימוש אמיתי.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel disabled={isPending}>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleReset()
            }}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? "מוחק..." : "מחק הכל"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
