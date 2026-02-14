'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center mb-8">
          <Logo variant="auto" width={140} height={49} />
          <p className="text-muted mt-2">Recupero Password</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-sm text-primary">
                Se l&apos;indirizzo esiste, riceverai un&apos;email con le istruzioni per reimpostare la password.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block text-sm text-primary hover:underline"
            >
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
              placeholder="nome@fodisrl.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Invio in corso...' : 'Invia istruzioni'}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-primary hover:underline"
              >
                Torna al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
