'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, X } from 'lucide-react'

interface ImpersonationBannerProps {
  userName: string
  onExit: () => void
}

export function ImpersonationBanner({ userName, onExit }: ImpersonationBannerProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleExit = async () => {
    setLoading(true)
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' })
      onExit()
      router.refresh()
      window.location.href = '/dashboard'
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-medium flex items-center justify-center gap-3 relative z-50">
      <Eye className="h-4 w-4 flex-shrink-0" />
      <span>
        Stai visualizzando come <strong>{userName}</strong>
      </span>
      <button
        onClick={handleExit}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/20 hover:bg-amber-950/30 transition-colors text-xs font-semibold"
      >
        {loading ? 'Uscita...' : 'Torna al tuo account'}
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
