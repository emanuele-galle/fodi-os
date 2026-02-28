'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, Save, Loader2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardHeading } from '@/components/ui/Card'

interface AiConfig {
  id: string
  name: string
  systemPrompt: string | null
  model: string
  temperature: number
  maxTokens: number
  enabledTools: string[]
  welcomeMessage: string | null
  isActive: boolean
}

interface ToolInfo {
  name: string
  description: string
  module: string
}

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Veloce)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Economico)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Potente)' },
]

export default function AiSettingsPage() {
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [enabledTools, setEnabledTools] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const [configRes, toolsRes] = await Promise.all([
        fetch('/api/ai/config'),
        fetch('/api/ai/tools'),
      ])

      if (toolsRes.ok) {
        const { data } = await toolsRes.json()
        setTools(data || [])
      }

      if (configRes.ok) {
        const { data } = await configRes.json()
        if (data) {
          setConfig(data)
          setName(data.name)
          setModel(data.model)
          setTemperature(data.temperature)
          setMaxTokens(data.maxTokens)
          setSystemPrompt(data.systemPrompt || '')
          setWelcomeMessage(data.welcomeMessage || '')
          setEnabledTools(data.enabledTools || [])
          setIsActive(data.isActive)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          model,
          temperature,
          maxTokens,
          systemPrompt: systemPrompt || null,
          welcomeMessage: welcomeMessage || null,
          enabledTools,
          isActive,
        }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setConfig(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleTool = (toolName: string) => {
    setEnabledTools(prev => {
      // If all tools are enabled (empty array), clicking one should disable ONLY that tool
      // by populating the array with all tools EXCEPT the clicked one
      if (prev.length === 0) {
        return tools.map(t => t.name).filter(t => t !== toolName)
      }
      // Normal toggle
      if (prev.includes(toolName)) {
        const next = prev.filter(t => t !== toolName)
        // If removing leaves all tools selected, reset to empty (= all enabled)
        return next.length === tools.length ? [] : next
      }
      const next = [...prev, toolName]
      // If adding makes all tools selected, reset to empty (= all enabled)
      return next.length === tools.length ? [] : next
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl shimmer" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-md shimmer" />
            <div className="h-4 w-64 rounded-md shimmer" />
          </div>
        </div>
        <div className="h-64 rounded-xl shimmer" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10">
            <Bot className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Impostazioni Assistente AI</h1>
            <p className="text-sm text-muted-foreground">Configura il comportamento e le capacità dell&apos;agente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConfig}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Ricarica"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? 'Salvato!' : 'Salva'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <Card>
          <CardHeader>
            <CardHeading>
              <CardTitle>Generale</CardTitle>
              <CardDescription>Nome, modello e parametri base</CardDescription>
            </CardHeading>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Stato</p>
                <p className="text-xs text-muted-foreground">Attiva o disattiva l&apos;assistente</p>
              </div>
              <button onClick={() => setIsActive(!isActive)} className="text-primary">
                {isActive ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">Nome agente</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Assistente AI"
              />
            </div>

            {/* Model */}
            <div>
              <label className="text-sm font-medium mb-1 block">Modello AI</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Temperature */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Temperatura: <span className="text-primary">{temperature}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Preciso</span>
                <span>Creativo</span>
              </div>
            </div>

            {/* Max tokens */}
            <div>
              <label className="text-sm font-medium mb-1 block">Max tokens risposta</label>
              <input
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value) || 4096)}
                min={256}
                max={16384}
                step={256}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tools */}
        <Card>
          <CardHeader>
            <CardHeading>
              <CardTitle>Tool abilitati</CardTitle>
              <CardDescription>
                {enabledTools.length === 0
                  ? 'Tutti i tool sono abilitati (nessun filtro)'
                  : `${enabledTools.length} tool selezionati`}
              </CardDescription>
            </CardHeading>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Lascia vuoto per abilitare tutti. Seleziona solo quelli che vuoi rendere disponibili.
            </p>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {tools.map(tool => (
                <label
                  key={tool.name}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={enabledTools.length === 0 || enabledTools.includes(tool.name)}
                    onChange={() => toggleTool(tool.name)}
                    className="mt-0.5 rounded accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardHeading>
              <CardTitle>System Prompt personalizzato</CardTitle>
              <CardDescription>Aggiunto in coda al prompt base. Lascia vuoto per usare solo il default.</CardDescription>
            </CardHeading>
          </CardHeader>
          <CardContent>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Istruzioni aggiuntive per l'agente..."
            />
          </CardContent>
        </Card>

        {/* Welcome Message */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardHeading>
              <CardTitle>Messaggio di benvenuto</CardTitle>
              <CardDescription>Mostrato quando l&apos;utente apre la chat AI per la prima volta</CardDescription>
            </CardHeading>
          </CardHeader>
          <CardContent>
            <textarea
              value={welcomeMessage}
              onChange={e => setWelcomeMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Ciao! Sono il tuo assistente AI. Come posso aiutarti?"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
