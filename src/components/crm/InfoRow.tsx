import { Hash } from 'lucide-react'

export function InfoRow({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm py-1.5">
      <div className="p-1.5 rounded-md bg-secondary/50 text-muted flex-shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-muted min-w-[60px]">{label}:</span>
      <span className="font-medium truncate">{value || '—'}</span>
    </div>
  )
}
