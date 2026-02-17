'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { ShieldCheck } from 'lucide-react'

export default function VerifyIpPage() {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [userId, setUserId] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('ipVerify_userId')
    const storedEmail = sessionStorage.getItem('ipVerify_maskedEmail')
    if (!storedUserId || !storedEmail) {
      router.push('/login')
      return
    }
    setUserId(storedUserId)
    setMaskedEmail(storedEmail)
    inputRefs.current[0]?.focus()
  }, [router])

  const handleSubmit = useCallback(async (code: string) => {
    if (!userId || code.length !== 6) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp: code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Codice non valido')
        if (data.expired) {
          sessionStorage.removeItem('ipVerify_userId')
          sessionStorage.removeItem('ipVerify_maskedEmail')
          setTimeout(() => router.push('/login'), 2000)
        }
        // Reset digits per ritentare
        setDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      // Successo
      sessionStorage.removeItem('ipVerify_userId')
      sessionStorage.removeItem('ipVerify_maskedEmail')
      router.push('/dashboard')
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }, [userId, router])

  const handleChange = (index: number, value: string) => {
    // Solo numeri
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit quando tutti i 6 digit sono inseriti
    const code = newDigits.join('')
    if (code.length === 6 && newDigits.every(d => d !== '')) {
      handleSubmit(code)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return

    const newDigits = [...digits]
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || ''
    }
    setDigits(newDigits)

    // Focus sull'ultimo digit inserito o sull'ultimo campo
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()

    if (pasted.length === 6) {
      handleSubmit(pasted)
    }
  }

  if (!userId) return null

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-primary) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <Logo variant="light" width={220} height={77} />
          <div className="mt-8 w-16 h-0.5 rounded-full" style={{ background: 'var(--gradient-brand)' }} />
          <p className="mt-6 text-lg text-white/80 max-w-sm leading-relaxed">
            Tecnologia italiana per far crescere il tuo business
          </p>
        </div>
      </div>

      {/* Right panel - OTP Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-sidebar rounded-xl p-4">
              <Logo variant="light" width={140} height={49} />
            </div>
          </div>

          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Verifica il tuo accesso
            </h1>
            <p className="text-muted mt-2 text-sm">
              Abbiamo inviato un codice di 6 cifre a<br />
              <strong className="text-foreground">{maskedEmail}</strong>
            </p>
          </div>

          <div className="space-y-6">
            {/* 6 digit inputs */}
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-border bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-center text-sm text-muted">
                Verifica in corso...
              </div>
            )}

            <div className="text-center space-y-3">
              <p className="text-xs text-muted">
                Il codice scade tra 10 minuti
              </p>
              <Link
                href="/login"
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  sessionStorage.removeItem('ipVerify_userId')
                  sessionStorage.removeItem('ipVerify_maskedEmail')
                }}
              >
                Torna al login
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-muted">
              &copy; 2026 FODI S.r.l. - Tutti i diritti riservati
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
