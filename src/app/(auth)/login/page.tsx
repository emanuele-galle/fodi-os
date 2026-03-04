'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- component handlers and dynamic props */
import { brandClient } from '@/lib/branding-client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { User, Lock, ArrowRight } from 'lucide-react'
import { Turnstile } from '@/components/ui/Turnstile'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const router = useRouter()

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstileToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Credenziali non valide')
        return
      }

      // Redirect CLIENT to portal, all others to dashboard
      if (data.data?.role === 'CLIENT') {
        router.push('/portal')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center p-12 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
        }} />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-8" style={{
          background: 'radial-gradient(circle, #0A84FF 0%, transparent 70%)',
        }} />
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative z-10 flex flex-col items-center text-center">
          <Logo variant="light" width={200} height={70} />
          <div className="mt-8 w-12 h-[2px] rounded-full bg-white/20" />
          <p className="mt-6 text-[17px] text-white/70 max-w-xs leading-relaxed font-light tracking-wide">
            Piattaforma gestionale per far crescere il tuo business
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <Logo variant="dark" width={160} height={56} />
          </div>

          <div className="mb-8">
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
              Bentornato
            </h1>
            <p className="text-muted mt-1.5 text-[15px]">
              Accedi a {brandClient.name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[13px] font-medium text-foreground/80">
                Username o Email
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted/60 transition-colors group-focus-within:text-primary" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="nome@esempio.it"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="flex h-12 w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-2 text-[15px] transition-all placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 hover:border-border"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-foreground/80">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted/60 transition-colors group-focus-within:text-primary" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="La tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex h-12 w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-2 text-[15px] transition-all placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 hover:border-border"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[13px] text-primary/80 hover:text-primary transition-colors"
              >
                Password dimenticata?
              </Link>
            </div>

            <Turnstile
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
            />

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/8 rounded-xl border border-destructive/15 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-2 gap-2" disabled={loading}>
              {loading ? 'Accesso in corso...' : (
                <>
                  Accedi
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-16 text-center">
            <p className="text-xs text-muted/60">
              &copy; {new Date().getFullYear()} {brandClient.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
