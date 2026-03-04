'use client'

/* eslint-disable react-perf/jsx-no-new-function-as-prop -- component handlers depend on dynamic state */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Paintbrush, RotateCcw, Save, Loader2 } from 'lucide-react'

interface BrandColors {
  colorPrimary: string
  colorPrimaryDark: string
  gradientStart: string
  gradientMid: string
  gradientEnd: string
}

const DEFAULT_EMPTY: BrandColors = {
  colorPrimary: '#007AFF',
  colorPrimaryDark: '#0f3460',
  gradientStart: '#1a1a2e',
  gradientMid: '#16213e',
  gradientEnd: '#0f3460',
}

const FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: 'colorPrimary', label: 'Colore Primario' },
  { key: 'colorPrimaryDark', label: 'Colore Primario (scuro)' },
  { key: 'gradientStart', label: 'Gradient — Inizio' },
  { key: 'gradientMid', label: 'Gradient — Centro' },
  { key: 'gradientEnd', label: 'Gradient — Fine' },
]

export default function BrandingPage() {
  const router = useRouter()
  const [colors, setColors] = useState<BrandColors>(DEFAULT_EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/session').then((r) => r.json()),
      fetch('/api/system/brand-settings').then((r) => r.json()),
    ]).then(([session, settings]) => {
      if (session?.user?.role !== 'ADMIN') {
        router.replace('/settings')
        return
      }
      setIsAdmin(true)
      if (settings && settings.id) {
        setColors({
          colorPrimary: settings.colorPrimary || DEFAULT_EMPTY.colorPrimary,
          colorPrimaryDark: settings.colorPrimaryDark || DEFAULT_EMPTY.colorPrimaryDark,
          gradientStart: settings.gradientStart || DEFAULT_EMPTY.gradientStart,
          gradientMid: settings.gradientMid || DEFAULT_EMPTY.gradientMid,
          gradientEnd: settings.gradientEnd || DEFAULT_EMPTY.gradientEnd,
        })
      }
      setLoaded(true)
    })
  }, [router])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/system/brand-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colors),
      })
      if (!res.ok) {
        const err = await res.json()
        setMessage(err.error || 'Errore durante il salvataggio')
        return
      }
      setMessage('Colori salvati! Ricarica la pagina per vedere le modifiche.')
    } catch {
      setMessage('Errore di rete')
    } finally {
      setSaving(false)
    }
  }, [colors])

  const handleReset = useCallback(async () => {
    setSaving(true)
    setMessage('')
    try {
      await fetch('/api/system/brand-settings', { method: 'DELETE' })
      setColors(DEFAULT_EMPTY)
      setMessage('Colori ripristinati ai valori predefiniti. Ricarica la pagina per vedere le modifiche.')
    } catch {
      setMessage('Errore di rete')
    } finally {
      setSaving(false)
    }
  }, [])

  if (!loaded || !isAdmin) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  const gradient = `linear-gradient(135deg, ${colors.gradientStart} 0%, ${colors.gradientMid} 50%, ${colors.gradientEnd} 100%)`

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Paintbrush className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Personalizzazione Brand</h1>
          <p className="text-xs md:text-sm text-muted">Personalizza i colori della piattaforma</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes('Errore') ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'
        }`}>
          {message}
        </div>
      )}

      <Card>
        <CardTitle>Colori</CardTitle>
        <CardContent>
          <div className="space-y-4">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors[field.key]}
                  onChange={(e) => setColors((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="h-10 w-14 rounded-lg border border-border/30 cursor-pointer bg-transparent p-0.5"
                />
                <div className="flex-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <input
                    type="text"
                    value={colors[field.key]}
                    onChange={(e) => {
                      const v = e.target.value
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                        setColors((prev) => ({ ...prev, [field.key]: v }))
                      }
                    }}
                    className="block w-full mt-1 px-3 py-1.5 text-xs font-mono rounded-md border border-border/30 bg-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardTitle>Anteprima</CardTitle>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted mb-2">Gradient (Login / Sidebar)</p>
              <div className="h-24 rounded-xl" style={{ background: gradient }} />
            </div>
            <div className="flex gap-3">
              <div>
                <p className="text-xs text-muted mb-2">Primario</p>
                <div className="h-12 w-20 rounded-lg" style={{ backgroundColor: colors.colorPrimary }} />
              </div>
              <div>
                <p className="text-xs text-muted mb-2">Primario Scuro</p>
                <div className="h-12 w-20 rounded-lg" style={{ backgroundColor: colors.colorPrimaryDark }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salva
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/30 text-sm font-medium hover:bg-secondary/60 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Ripristina default
        </button>
      </div>
    </div>
  )
}
