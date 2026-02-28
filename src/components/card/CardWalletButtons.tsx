'use client'

import { useState, useEffect } from 'react'
import { Wallet, Smartphone } from 'lucide-react'

type CardWalletButtonsProps = {
  slug: string
}

function useOS() {
  const [os] = useState<'ios' | 'android' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop'
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
    if (/android/i.test(ua)) return 'android'
    return 'desktop'
  })
  return os
}

export default function CardWalletButtons({ slug }: CardWalletButtonsProps) {
  const os = useOS()
  const [loadingApple, setLoadingApple] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAppleWallet = async () => {
    if (loadingApple) return
    setLoadingApple(true)
    setError(null)

    try {
      const res = await fetch(`/api/c/${slug}/wallet/apple`)
      if (!res.ok) throw new Error('Errore download pass')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}.pkpass`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Impossibile generare il pass Apple')
    } finally {
      setLoadingApple(false)
    }
  }

  const handleGoogleWallet = async () => {
    if (loadingGoogle) return
    setLoadingGoogle(true)
    setError(null)

    try {
      const res = await fetch(`/api/c/${slug}/wallet/google`)
      if (!res.ok) throw new Error('Errore generazione URL')

      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch {
      setError('Impossibile generare il pass Google')
    } finally {
      setLoadingGoogle(false)
    }
  }

  const showApple = os === 'ios' || os === 'desktop'
  const showGoogle = os === 'android' || os === 'desktop'

  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${showApple && showGoogle ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {showApple && (
          <button
            onClick={handleAppleWallet}
            disabled={loadingApple}
            className="group relative flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: 'inset 0 0 30px rgba(255,255,255,0.03), 0 0 20px rgba(255,255,255,0.02)' }} />
            <AppleIcon className="w-5 h-5 text-white/70 relative" />
            <span className="relative text-[13px] font-medium text-white/60">
              {loadingApple ? 'Caricamento...' : 'Apple Wallet'}
            </span>
          </button>
        )}

        {showGoogle && (
          <button
            onClick={handleGoogleWallet}
            disabled={loadingGoogle}
            className="group relative flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: 'inset 0 0 30px rgba(66,133,244,0.05), 0 0 20px rgba(66,133,244,0.03)' }} />
            <GoogleWalletIcon className="w-5 h-5 relative" />
            <span className="relative text-[13px] font-medium text-white/60">
              {loadingGoogle ? 'Caricamento...' : 'Google Wallet'}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-center text-[12px] text-red-400/70">{error}</p>
      )}
    </div>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function GoogleWalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.27-.97 2.34-2.06 3.06v2.54h3.33c1.95-1.8 3.07-4.44 3.07-7.58 0-.52-.05-1.02-.14-1.5l-.53-.25z" fill="#4285F4" />
      <path d="M12.17 21.5c2.78 0 5.12-.92 6.82-2.5l-3.33-2.54c-.92.62-2.1.99-3.49.99-2.69 0-4.97-1.82-5.78-4.27H2.95v2.63c1.71 3.39 5.22 5.69 9.22 5.69z" fill="#34A853" />
      <path d="M6.39 13.18A5.87 5.87 0 0 1 6.07 12c0-.41.07-.81.19-1.18V8.19H2.95A9.93 9.93 0 0 0 2 12c0 1.61.39 3.13 1.07 4.48l3.32-2.63v-.67z" fill="#FBBC05" />
      <path d="M12.17 5.55c1.52 0 2.88.52 3.95 1.55l2.96-2.96C17.27 2.41 14.93 1.5 12.17 1.5 8.17 1.5 4.66 3.8 2.95 7.19l3.44 2.63c.81-2.45 3.09-4.27 5.78-4.27z" fill="#EA4335" />
    </svg>
  )
}
