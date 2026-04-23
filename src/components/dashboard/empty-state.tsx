import { NewFormDialog } from "./new-form-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface EmptyStateProps {
  isSuperadmin: boolean
}

export function EmptyState({ isSuperadmin }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-5">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          className="text-neutral-400"
        >
          <rect x="3" y="3" width="18" height="4" rx="1.5" fill="currentColor" opacity="0.5" />
          <rect x="3" y="10" width="13" height="4" rx="1.5" fill="currentColor" opacity="0.4" />
          <rect x="3" y="17" width="9" height="4" rx="1.5" fill="currentColor" opacity="0.3" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-1.5">
        עדיין אין לך טפסים
      </h3>
      <p className="text-sm text-neutral-500 max-w-xs mb-6">
        צור את הטופס הראשון שלך כדי להתחיל לאסוף תגובות.
      </p>
      <NewFormDialog
        isSuperadmin={isSuperadmin}
        trigger={
          <Button className="rounded-xl gap-2 h-10 bg-orange-600 hover:bg-orange-500 text-white border-0">
            <Plus className="h-4 w-4" />
            צור טופס
          </Button>
        }
      />
    </div>
  )
}
