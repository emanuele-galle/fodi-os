'use client'

/* eslint-disable react-perf/jsx-no-new-function-as-prop -- component handlers depend on dynamic state */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import {
  Paintbrush, RotateCcw, Save, Loader2, Upload, X, Image,
} from 'lucide-react'

// ── Types ──

interface BrandSettingsData {
  colorPrimary: string
  colorPrimaryDark: string
  gradientStart: string
  gradientMid: string
  gradientEnd: string
  brandName: string
  loginHeading: string
  loginSubtext: string
  copyrightText: string
  logoDarkUrl: string
  logoLightUrl: string
  faviconUrl: string
  borderRadius: string
}

const DEFAULTS: BrandSettingsData = {
  colorPrimary: '#007AFF',
  colorPrimaryDark: '#0f3460',
  gradientStart: '#1a1a2e',
  gradientMid: '#16213e',
  gradientEnd: '#0f3460',
  brandName: '',
  loginHeading: '',
  loginSubtext: '',
  copyrightText: '',
  logoDarkUrl: '',
  logoLightUrl: '',
  faviconUrl: '',
  borderRadius: 'xl',
}

const RADIUS_OPTIONS = [
  { value: 'none', label: 'Nessuno', preview: '0' },
  { value: 'sm', label: 'Piccolo', preview: '0.25rem' },
  { value: 'md', label: 'Medio', preview: '0.5rem' },
  { value: 'lg', label: 'Grande', preview: '0.75rem' },
  { value: 'xl', label: 'Extra', preview: '1rem' },
  { value: '2xl', label: 'Doppio', preview: '1.5rem' },
  { value: 'full', label: 'Pieno', preview: '9999px' },
]

const COLOR_FIELDS = [
  { key: 'colorPrimary' as const, label: 'Colore Primario' },
  { key: 'colorPrimaryDark' as const, label: 'Colore Primario (scuro)' },
  { key: 'gradientStart' as const, label: 'Gradient — Inizio' },
  { key: 'gradientMid' as const, label: 'Gradient — Centro' },
  { key: 'gradientEnd' as const, label: 'Gradient — Fine' },
]

// ── Logo Upload Component ──

function LogoUpload({ label, value, type, onUploaded }: {
  label: string
  value: string
  type: 'logo-dark' | 'logo-light' | 'favicon'
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const res = await fetch('/api/system/brand-settings/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Errore upload')
        return
      }
      const data = await res.json()
      onUploaded(data.fileUrl)
    } catch {
      alert('Errore di rete durante upload')
    } finally {
      setUploading(false)
    }
  }, [type, onUploaded])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-lg border border-border/30 bg-secondary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <Image className="h-6 w-6 text-muted" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-xs font-medium hover:bg-secondary/60 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Carica
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onUploaded('')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Rimuovi
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted">PNG, JPG, SVG o WebP — max 2MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

// ── Color Picker Field ──

function ColorField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded-lg border border-border/30 cursor-pointer bg-transparent p-0.5"
      />
      <div className="flex-1">
        <label className="text-sm font-medium">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          className="block w-full mt-1 px-3 py-1.5 text-xs font-mono rounded-md border border-border/30 bg-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
          maxLength={7}
        />
      </div>
    </div>
  )
}

// ── Login Preview ──

function LoginPreview({ settings }: { settings: BrandSettingsData }) {
  const gradient = `linear-gradient(135deg, ${settings.gradientStart} 0%, ${settings.gradientMid} 50%, ${settings.gradientEnd} 100%)`
  const radiusPx = RADIUS_OPTIONS.find((r) => r.value === settings.borderRadius)?.preview || '1rem'

  return (
    <div className="rounded-xl border border-border/30 overflow-hidden shadow-[var(--shadow-md)]">
      <div className="flex h-48 md:h-56">
        {/* Left panel - gradient */}
        <div className="w-1/2 flex flex-col items-center justify-center p-4 text-white relative" style={{ background: gradient }}>
          {settings.logoDarkUrl ? (
            <img src={settings.logoDarkUrl} alt="Logo" className="h-8 mb-3 object-contain" />
          ) : (
            <div className="h-8 w-20 rounded bg-white/20 mb-3" />
          )}
          <p className="text-[10px] text-white/70 text-center leading-tight">
            {settings.loginSubtext || 'Piattaforma gestionale per far crescere il tuo business'}
          </p>
        </div>
        {/* Right panel - form */}
        <div className="w-1/2 bg-card flex flex-col items-center justify-center p-4">
          <p className="text-sm font-bold mb-3 text-foreground">
            {settings.loginHeading || 'Bentornato'}
          </p>
          <div className="w-full max-w-[120px] space-y-2">
            <div className="h-5 rounded bg-secondary/60 w-full" style={{ borderRadius: radiusPx }} />
            <div className="h-5 rounded bg-secondary/60 w-full" style={{ borderRadius: radiusPx }} />
            <div
              className="h-5 w-full text-[8px] font-medium text-white flex items-center justify-center"
              style={{ backgroundColor: settings.colorPrimary, borderRadius: radiusPx }}
            >
              Accedi
            </div>
          </div>
          <p className="text-[8px] text-muted mt-2">
            {settings.copyrightText || settings.brandName || 'Brand'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──

export default function BrandingPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<BrandSettingsData>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/session').then((r) => r.json()),
      fetch('/api/system/brand-settings').then((r) => r.json()),
    ]).then(([session, data]) => {
      if (session?.user?.role !== 'ADMIN') {
        router.replace('/settings')
        return
      }
      setIsAdmin(true)
      if (data && data.id) {
        setSettings({
          colorPrimary: data.colorPrimary || DEFAULTS.colorPrimary,
          colorPrimaryDark: data.colorPrimaryDark || DEFAULTS.colorPrimaryDark,
          gradientStart: data.gradientStart || DEFAULTS.gradientStart,
          gradientMid: data.gradientMid || DEFAULTS.gradientMid,
          gradientEnd: data.gradientEnd || DEFAULTS.gradientEnd,
          brandName: data.brandName || '',
          loginHeading: data.loginHeading || '',
          loginSubtext: data.loginSubtext || '',
          copyrightText: data.copyrightText || '',
          logoDarkUrl: data.logoDarkUrl || '',
          logoLightUrl: data.logoLightUrl || '',
          faviconUrl: data.faviconUrl || '',
          borderRadius: data.borderRadius || 'xl',
        })
      }
      setLoaded(true)
    })
  }, [router])

  const updateField = useCallback(<K extends keyof BrandSettingsData>(key: K, value: BrandSettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setMessage('')
    try {
      const payload: Record<string, string | null | undefined> = {}
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'borderRadius') {
          payload[key] = value as string
        } else if (typeof value === 'string' && value === '') {
          payload[key] = null
        } else {
          payload[key] = value as string
        }
      }

      const res = await fetch('/api/system/brand-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        setMessage(err.error || 'Errore durante il salvataggio')
        return
      }

      // Apply CSS vars live
      const root = document.documentElement
      root.style.setProperty('--brand-primary', settings.colorPrimary)
      root.style.setProperty('--brand-primary-dark', settings.colorPrimaryDark)
      root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${settings.gradientStart} 0%, ${settings.gradientMid} 50%, ${settings.gradientEnd} 100%)`)
      const radiusMap: Record<string, string> = {
        none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', '2xl': '1.5rem', full: '9999px',
      }
      root.style.setProperty('--brand-radius', radiusMap[settings.borderRadius] || '1rem')

      setMessage('Impostazioni salvate! I colori sono stati applicati. Per logo e testi, ricarica la pagina.')
    } catch {
      setMessage('Errore di rete')
    } finally {
      setSaving(false)
    }
  }, [settings])

  const handleReset = useCallback(async () => {
    setSaving(true)
    setMessage('')
    try {
      await fetch('/api/system/brand-settings', { method: 'DELETE' })
      setSettings(DEFAULTS)
      // Reset CSS vars
      const root = document.documentElement
      root.style.setProperty('--brand-primary', DEFAULTS.colorPrimary)
      root.style.setProperty('--brand-primary-dark', DEFAULTS.colorPrimaryDark)
      root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${DEFAULTS.gradientStart} 0%, ${DEFAULTS.gradientMid} 50%, ${DEFAULTS.gradientEnd} 100%)`)
      root.style.setProperty('--brand-radius', '1rem')
      setMessage('Impostazioni ripristinate ai valori predefiniti.')
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

  const tabs = [
    {
      id: 'identity',
      label: 'Identità',
      content: (
        <Card>
          <CardTitle>Identità</CardTitle>
          <CardContent>
            <div className="space-y-5 mt-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Nome piattaforma</label>
                <input
                  type="text"
                  value={settings.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                  placeholder="Es. Muscari OS"
                  className="flex h-10 w-full rounded-[10px] border border-border/40 bg-card px-3 py-2 text-sm transition-all shadow-[var(--shadow-sm)] placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                  maxLength={100}
                />
                <p className="text-[11px] text-muted">Sovrascrive il nome predefinito ovunque nella piattaforma</p>
              </div>

              <div className="border-t border-border/20 pt-5">
                <LogoUpload
                  label="Logo (sfondo scuro)"
                  value={settings.logoDarkUrl}
                  type="logo-dark"
                  onUploaded={(url) => updateField('logoDarkUrl', url)}
                />
              </div>

              <LogoUpload
                label="Logo (sfondo chiaro)"
                value={settings.logoLightUrl}
                type="logo-light"
                onUploaded={(url) => updateField('logoLightUrl', url)}
              />

              <div className="border-t border-border/20 pt-5">
                <LogoUpload
                  label="Favicon"
                  value={settings.faviconUrl}
                  type="favicon"
                  onUploaded={(url) => updateField('faviconUrl', url)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'colors',
      label: 'Colori',
      content: (
        <div className="space-y-6">
          <Card>
            <CardTitle>Palette Colori</CardTitle>
            <CardContent>
              <div className="space-y-4 mt-4">
                {COLOR_FIELDS.map((field) => (
                  <ColorField
                    key={field.key}
                    label={field.label}
                    value={settings[field.key]}
                    onChange={(v) => updateField(field.key, v)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardTitle>Anteprima Gradient</CardTitle>
            <CardContent>
              <div className="space-y-4 mt-3">
                <div
                  className="h-24 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${settings.gradientStart} 0%, ${settings.gradientMid} 50%, ${settings.gradientEnd} 100%)` }}
                />
                <div className="flex gap-3">
                  <div>
                    <p className="text-xs text-muted mb-2">Primario</p>
                    <div className="h-12 w-20 rounded-lg" style={{ backgroundColor: settings.colorPrimary }} />
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-2">Primario Scuro</p>
                    <div className="h-12 w-20 rounded-lg" style={{ backgroundColor: settings.colorPrimaryDark }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: 'texts',
      label: 'Testi Login',
      content: (
        <Card>
          <CardTitle>Testi Pagina Login</CardTitle>
          <CardContent>
            <div className="space-y-5 mt-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Titolo login</label>
                <input
                  type="text"
                  value={settings.loginHeading}
                  onChange={(e) => updateField('loginHeading', e.target.value)}
                  placeholder="Bentornato"
                  className="flex h-10 w-full rounded-[10px] border border-border/40 bg-card px-3 py-2 text-sm transition-all shadow-[var(--shadow-sm)] placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Sottotitolo brand</label>
                <textarea
                  value={settings.loginSubtext}
                  onChange={(e) => updateField('loginSubtext', e.target.value)}
                  placeholder="Piattaforma gestionale per far crescere il tuo business"
                  rows={3}
                  className="flex w-full rounded-[10px] border border-border/40 bg-card px-3 py-2 text-sm transition-all shadow-[var(--shadow-sm)] placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 resize-none"
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Testo copyright footer</label>
                <input
                  type="text"
                  value={settings.copyrightText}
                  onChange={(e) => updateField('copyrightText', e.target.value)}
                  placeholder="Es. © 2026 Nome Azienda"
                  className="flex h-10 w-full rounded-[10px] border border-border/40 bg-card px-3 py-2 text-sm transition-all shadow-[var(--shadow-sm)] placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                  maxLength={200}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'style',
      label: 'Stile UI',
      content: (
        <Card>
          <CardTitle>Border Radius Globale</CardTitle>
          <CardContent>
            <div className="mt-4">
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('borderRadius', opt.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      settings.borderRadius === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/30 hover:border-border/60'
                    }`}
                  >
                    <div
                      className="h-10 w-10 bg-primary/20 border border-primary/40"
                      style={{ borderRadius: opt.preview }}
                    />
                    <span className="text-[11px] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-3">
                Questo valore influenza i bordi arrotondati di bottoni, card e campi di input in tutta la piattaforma.
              </p>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'preview',
      label: 'Anteprima',
      content: (
        <div className="space-y-6">
          <Card>
            <CardTitle>Anteprima Login</CardTitle>
            <CardContent>
              <div className="mt-3">
                <LoginPreview settings={settings} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardTitle>Riepilogo</CardTitle>
            <CardContent>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Nome piattaforma</span>
                  <span className="font-medium">{settings.brandName || '(predefinito)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Titolo login</span>
                  <span className="font-medium">{settings.loginHeading || 'Bentornato'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Border radius</span>
                  <span className="font-medium">{RADIUS_OPTIONS.find((r) => r.value === settings.borderRadius)?.label || settings.borderRadius}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Colore primario</span>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: settings.colorPrimary }} />
                    <span className="font-mono text-xs">{settings.colorPrimary}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Logo scuro</span>
                  <span className="font-medium">{settings.logoDarkUrl ? 'Caricato' : '(predefinito)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Logo chiaro</span>
                  <span className="font-medium">{settings.logoLightUrl ? 'Caricato' : '(predefinito)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Favicon</span>
                  <span className="font-medium">{settings.faviconUrl ? 'Caricato' : '(predefinito)'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ]

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Paintbrush className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Personalizzazione Brand</h1>
          <p className="text-xs md:text-sm text-muted">Personalizza identità, colori, testi e stile della piattaforma</p>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes('Errore') ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'
        }`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="identity" />

      {/* Action buttons */}
      <div className="flex gap-3 pt-2 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salva tutto
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/30 text-sm font-medium hover:bg-secondary/60 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Ripristina default
        </button>
      </div>
    </div>
  )
}
