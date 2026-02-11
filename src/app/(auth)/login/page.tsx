'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Mail, Lock } from 'lucide-react'

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
    <div className="min-h-screen flex">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E293B] relative flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #C4A052 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <Image
            src="/logo-fodi.png"
            alt="FODI"
            width={220}
            height={77}
            priority
          />
          <div className="mt-8 w-16 h-0.5 bg-gradient-to-r from-[#A68A3E] to-[#D4B566] rounded-full" />
          <p className="mt-6 text-lg text-white/80 max-w-sm leading-relaxed">
            Tecnologia italiana per far crescere il tuo business
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-[#1E293B] rounded-xl p-4">
              <Image
                src="/logo-fodi.png"
                alt="FODI"
                width={140}
                height={49}
                priority
              />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Benvenuto in FODI OS
            </h1>
            <p className="text-muted mt-1">Piattaforma Gestionale</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@fodisrl.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-border bg-transparent pl-10 pr-3 py-2 text-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="La tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-border bg-transparent pl-10 pr-3 py-2 text-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
            </div>

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
