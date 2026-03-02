import { Skeleton } from "@/components/ui/skeleton"

export default function AttendanceLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-36 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Presence cards skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-48 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </main>
    </div>
  )
}
