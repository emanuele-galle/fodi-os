import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
      </div>

      {/* Stats cards - horizontal on mobile, grid on tablet/desktop */}
      <div className="md:hidden flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] min-w-[140px] flex-shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3.5 lg:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[94px] lg:h-[100px] rounded-xl" />
        ))}
      </div>

      {/* Quick actions - circles on mobile */}
      <div className="md:hidden flex justify-around">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        ))}
      </div>
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[240px] lg:h-64 w-full rounded-xl" />
        <Skeleton className="h-[240px] lg:h-64 w-full rounded-xl hidden lg:block" />
      </div>

      {/* Activity / Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-48 w-full rounded-xl md:col-span-1 lg:col-span-2" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}
