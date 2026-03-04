'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- component handlers and dynamic props */
import { brandClient } from '@/lib/branding-client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

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
            Recupera l&apos;accesso al tuo account in modo sicuro
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
              Recupero Password
            </h1>
            <p className="text-muted mt-1.5 text-[15px]">
              Ti invieremo le istruzioni via email
            </p>
          </div>

          {submitted ? (
            <div className="space-y-6">
              <div className="p-4 bg-primary/8 border border-primary/15 rounded-xl">
                <p className="text-sm text-primary">
                  Se l&apos;indirizzo esiste, riceverai un&apos;email con le istruzioni per reimpostare la password.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted">
                Inserisci il tuo indirizzo email. Se esiste un account associato, riceverai le istruzioni per reimpostare la password.
              </p>

              <Input
                id="email"
                label="Email"
                type="email"
                placeholder={`${brandClient.slug}@example.com`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? 'Invio in corso...' : 'Invia istruzioni'}
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
