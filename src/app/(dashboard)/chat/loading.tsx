import { Skeleton } from '@/components/ui/Skeleton'

export default function ChatLoading() {
  return (
    <div className="animate-fade-in flex h-[calc(100vh-8rem)] gap-0 rounded-xl border border-border/40 overflow-hidden">
      {/* Channel list sidebar */}
      <div className="w-72 border-r border-border/40 p-3 space-y-2 hidden md:block">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-1 mt-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="p-4 border-b border-border/40 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'justify-end'}`}>
              {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className={`h-12 rounded-xl ${i % 2 === 0 ? 'w-64' : 'w-48'}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border/40">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
