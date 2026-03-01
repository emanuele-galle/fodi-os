import { Skeleton } from '@/components/ui/Skeleton'

export default function AiLoading() {
  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 space-y-4 mb-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-16 w-3/4 rounded-xl" />
        </div>
        <div className="flex gap-3 justify-end">
          <Skeleton className="h-12 w-2/3 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-20 w-3/4 rounded-xl" />
        </div>
      </div>

      {/* Input */}
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  )
}
