import { Skeleton } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border/40 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Theme section */}
      <div className="rounded-xl border border-border/40 p-6 space-y-4">
        <Skeleton className="h-5 w-24 rounded-md" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-40 rounded-xl" />
          <Skeleton className="h-20 w-40 rounded-xl" />
        </div>
      </div>

      {/* Notifications section */}
      <div className="rounded-xl border border-border/40 p-6 space-y-3">
        <Skeleton className="h-5 w-28 rounded-md" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
