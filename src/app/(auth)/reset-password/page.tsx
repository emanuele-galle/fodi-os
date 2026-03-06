'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- component handlers and dynamic props */
import { brandClient } from '@/lib/branding-client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il reset della password')
        return
      }

      setSuccess(true)
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const isInvalidToken = !token

  return (
    <>
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
          Nuova Password
        </h1>
        <p className="text-muted mt-1.5 text-[15px]">
          Scegli una nuova password per il tuo account
        </p>
      </div>

      {isInvalidToken ? (
        <div className="space-y-6">
          <div className="p-4 bg-destructive/8 border border-destructive/15 rounded-xl">
            <p className="text-sm text-destructive">
              Link non valido. Richiedi un nuovo reset della password.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Richiedi nuovo reset
          </Link>
        </div>
      ) : success ? (
        <div className="space-y-6">
          <div className="p-4 bg-primary/8 border border-primary/15 rounded-xl flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-primary">
              Password aggiornata con successo. Ora puoi accedere con la nuova password.
            </p>
          </div>
          <Link href="/login">
            <Button size="lg" className="w-full gap-2">
              Vai al login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[13px] font-medium text-foreground/80">
              Nuova password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted/60 transition-colors group-focus-within:text-primary" />
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimo 8 caratteri, 1 maiuscola, 1 numero"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="flex h-12 w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-2 text-[15px] transition-all placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 hover:border-border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-[13px] font-medium text-foreground/80">
              Conferma password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted/60 transition-colors group-focus-within:text-primary" />
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Ripeti la password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="flex h-12 w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-2 text-[15px] transition-all placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 hover:border-border"
              />
            </div>
          </div>

          <p className="text-xs text-muted/70">
            La password deve contenere almeno 8 caratteri, una lettera maiuscola e un numero.
          </p>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/8 rounded-xl border border-destructive/15 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? 'Aggiornamento in corso...' : 'Imposta nuova password'}
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[13px] text-primary/80 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Torna al login
            </Link>
          </div>
        </form>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center p-12 overflow-hidden" style={{
        background: 'var(--brand-gradient)',
      }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{
          background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)',
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
            Imposta la tua nuova password in modo sicuro
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

          <Suspense fallback={
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
                Nuova Password
              </h1>
              <p className="text-muted mt-1.5 text-[15px]">
                Caricamento...
              </p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>

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
