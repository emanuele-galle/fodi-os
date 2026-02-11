'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Credenziali non valide')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            FODI<span className="text-primary">OS</span>
          </h1>
          <p className="text-muted mt-2">Piattaforma Gestionale</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="nome@fodisrl.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="La tua password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 text-sm text-destructive bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </Button>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Hai dimenticato la password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
