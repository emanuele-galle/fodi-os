import { Skeleton } from '@/components/ui/Skeleton'

export default function TimeLoading() {
  return (
    <div className="animate-fade-in space-y-4">
      <Skeleton className="h-6 w-32 rounded-md" />
      <Skeleton className="h-4 w-48 rounded-md" />
    </div>
  )
}
