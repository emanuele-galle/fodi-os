'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot, Save, Loader2, RefreshCw, Brain, Volume2, Wrench, MessageSquare,
  Sparkles, Zap, Settings2, ChevronDown, ChevronRight, Check, Phone,
} from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

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
  enableThinking: boolean
  thinkingEffort: string
  ttsProvider: string
  ttsVoice: string | null
  autoPlayVoice: boolean
  voiceAgentId: string | null
  voiceAgentEnabled: boolean
}

interface ToolInfo {
  name: string
  description: string
  module: string
}

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', badge: 'Veloce', color: 'text-blue-400' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', badge: 'Economico', color: 'text-emerald-400' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', badge: 'Potente', color: 'text-violet-400' },
]

const THINKING_LEVELS = [
  { value: 'low', label: 'Basso', desc: 'Risposte rapide', tokens: '2K', color: 'text-emerald-400' },
  { value: 'medium', label: 'Medio', desc: 'Bilanciato', tokens: '5K', color: 'text-amber-400' },
  { value: 'high', label: 'Alto', desc: 'Analisi approfondita', tokens: '10K', color: 'text-red-400' },
]

const TTS_PROVIDERS = [
  { value: 'disabled', label: 'Disabilitato', desc: 'Nessuna sintesi vocale' },
  { value: 'openai', label: 'OpenAI TTS', desc: 'Voce naturale, 9 voci' },
  { value: 'elevenlabs', label: 'ElevenLabs', desc: 'Voce premium, multilingua' },
]

const MODULE_LABELS: Record<string, { label: string; icon: typeof Sparkles; color: string }> = {
  pm: { label: 'Progetti & Task', icon: Wrench, color: 'text-blue-400' },
  crm: { label: 'CRM', icon: Sparkles, color: 'text-emerald-400' },
  calendar: { label: 'Calendario', icon: Sparkles, color: 'text-orange-400' },
  erp: { label: 'ERP & Finanza', icon: Sparkles, color: 'text-violet-400' },
  support: { label: 'Support', icon: Sparkles, color: 'text-amber-400' },
  reports: { label: 'Report', icon: Sparkles, color: 'text-cyan-400' },
  chat: { label: 'Chat & Notifiche', icon: MessageSquare, color: 'text-pink-400' },
  daily: { label: 'Riepilogo', icon: Zap, color: 'text-yellow-400' },
}

type Tab = 'general' | 'tools' | 'prompts'

// eslint-disable-next-line sonarjs/cognitive-complexity -- settings page
export default function AiSettingsPage() {
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('general')

  // Form state
  const [name, setName] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [enabledTools, setEnabledTools] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [enableThinking, setEnableThinking] = useState(true)
  const [thinkingEffort, setThinkingEffort] = useState('medium')
  const [ttsProvider, setTtsProvider] = useState('disabled')
  const [ttsVoice, setTtsVoice] = useState('')
  const [autoPlayVoice, setAutoPlayVoice] = useState(false)
  const [voiceAgentId, setVoiceAgentId] = useState('')
  const [voiceAgentEnabled, setVoiceAgentEnabled] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

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
          setEnableThinking(data.enableThinking ?? true)
          setThinkingEffort(data.thinkingEffort || 'medium')
          setTtsProvider(data.ttsProvider || 'disabled')
          setTtsVoice(data.ttsVoice || '')
          setAutoPlayVoice(data.autoPlayVoice ?? false)
          setVoiceAgentId(data.voiceAgentId || '')
          setVoiceAgentEnabled(data.voiceAgentEnabled ?? false)
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
          name, model, temperature, maxTokens,
          systemPrompt: systemPrompt || null,
          welcomeMessage: welcomeMessage || null,
          enabledTools, isActive,
          enableThinking, thinkingEffort,
          ttsProvider, ttsVoice: ttsVoice || null, autoPlayVoice,
          voiceAgentId: voiceAgentId || null, voiceAgentEnabled,
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
      if (prev.length === 0) {
        return tools.map(t => t.name).filter(t => t !== toolName)
      }
      if (prev.includes(toolName)) {
        const next = prev.filter(t => t !== toolName)
        return next.length === tools.length ? [] : next
      }
      const next = [...prev, toolName]
      return next.length === tools.length ? [] : next
    })
  }

  // Group tools by module
  const toolsByModule = tools.reduce<Record<string, ToolInfo[]>>((acc, tool) => {
    const mod = tool.module || 'other'
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(tool)
    return acc
  }, {})

  const enabledCount = enabledTools.length === 0 ? tools.length : enabledTools.length

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-40 lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Assistente AI</h1>
            <p className="text-xs md:text-sm text-muted">Configura comportamento, capacità e voce dell&apos;agente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? 'success' : 'outline'} className="text-xs px-3 py-1">
            {isActive ? 'Attivo' : 'Disattivo'}
          </Badge>
          <button
            onClick={loadConfig}
            className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
            title="Ricarica"
          >
            <RefreshCw className="h-4 w-4 text-muted" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              saved
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Salvato!' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mb-6 w-fit">
        {([
          { id: 'general' as Tab, label: 'Generale', icon: Settings2 },
          { id: 'tools' as Tab, label: `Tool (${enabledCount})`, icon: Wrench },
          { id: 'prompts' as Tab, label: 'Prompt & Messaggi', icon: MessageSquare },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-card shadow-[var(--shadow-sm)] text-foreground'
                : 'text-muted hover:text-foreground',
            )}
          >
            <tab.icon className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Generale */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Identità */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-5">
                <Bot className="h-4 w-4 text-violet-400" />
                <CardTitle>Identità</CardTitle>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">Stato agente</p>
                    <p className="text-xs text-muted">
                      {isActive ? 'L\'assistente è attivo e disponibile' : 'L\'assistente è disabilitato'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      isActive ? 'bg-emerald-500' : 'bg-secondary',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      isActive && 'translate-x-5',
                    )} />
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome agente</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-secondary/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    placeholder="Assistente AI"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modello */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-5">
                <Zap className="h-4 w-4 text-amber-400" />
                <CardTitle>Modello AI</CardTitle>
              </div>
              <div className="space-y-3">
                {MODELS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                      model === m.value
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/30 hover:border-border/60 hover:bg-secondary/30',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full border-2 transition-all',
                        model === m.value ? 'border-primary bg-primary' : 'border-border',
                      )} />
                      <span className="text-sm font-medium">{m.label}</span>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px]', m.color)}>{m.badge}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Parametri */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-5">
                <Settings2 className="h-4 w-4 text-blue-400" />
                <CardTitle>Parametri</CardTitle>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Temperatura</label>
                    <span className="text-sm font-mono text-primary">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted mt-1">
                    <span>Preciso</span>
                    <span>Creativo</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Max token risposta</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={e => setMaxTokens(parseInt(e.target.value) || 4096)}
                    min={256}
                    max={16384}
                    step={256}
                    className="w-full rounded-lg border border-border/40 bg-secondary/30 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ragionamento AI */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-5">
                <Brain className="h-4 w-4 text-violet-400" />
                <CardTitle>Ragionamento</CardTitle>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">Extended Thinking</p>
                    <p className="text-xs text-muted">L&apos;agente ragiona prima di rispondere</p>
                  </div>
                  <button
                    onClick={() => setEnableThinking(!enableThinking)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      enableThinking ? 'bg-violet-500' : 'bg-secondary',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      enableThinking && 'translate-x-5',
                    )} />
                  </button>
                </div>

                {enableThinking && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Livello</label>
                    {THINKING_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setThinkingEffort(level.value)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                          thinkingEffort === level.value
                            ? 'border-violet-500/40 bg-violet-500/5'
                            : 'border-border/30 hover:border-border/60 hover:bg-secondary/30',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-3 h-3 rounded-full border-2 transition-all',
                            thinkingEffort === level.value ? 'border-violet-500 bg-violet-500' : 'border-border',
                          )} />
                          <div>
                            <span className="text-sm font-medium">{level.label}</span>
                            <span className="text-xs text-muted ml-2">{level.desc}</span>
                          </div>
                        </div>
                        <span className={cn('text-xs font-mono', level.color)}>{level.tokens} tokens</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Voce */}
          <Card className="lg:col-span-2">
            <CardContent>
              <div className="flex items-center gap-2 mb-5">
                <Volume2 className="h-4 w-4 text-pink-400" />
                <CardTitle>Voce</CardTitle>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {TTS_PROVIDERS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setTtsProvider(p.value)}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border transition-all text-left',
                      ttsProvider === p.value
                        ? 'border-pink-500/40 bg-pink-500/5'
                        : 'border-border/30 hover:border-border/60 hover:bg-secondary/30',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        'w-3 h-3 rounded-full border-2 transition-all',
                        ttsProvider === p.value ? 'border-pink-500 bg-pink-500' : 'border-border',
                      )} />
                      <span className="text-sm font-medium">{p.label}</span>
                    </div>
                    <span className="text-xs text-muted ml-5">{p.desc}</span>
                  </button>
                ))}
              </div>

              {ttsProvider !== 'disabled' && (
                <div className="flex flex-col sm:flex-row gap-4 pt-3 border-t border-border/30">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1.5 block">Voice ID</label>
                    <input
                      type="text"
                      value={ttsVoice}
                      onChange={e => setTtsVoice(e.target.value)}
                      className="w-full rounded-lg border border-border/40 bg-secondary/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                      placeholder={ttsProvider === 'openai' ? 'nova (default) — alloy, echo, fable, onyx, sage, shimmer' : 'Matilda (default) — o inserisci un voice ID'}
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:pt-6">
                    <button
                      onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                        autoPlayVoice ? 'bg-pink-500' : 'bg-secondary',
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                        autoPlayVoice && 'translate-x-5',
                      )} />
                    </button>
                    <div>
                      <p className="text-sm font-medium">Auto-play</p>
                      <p className="text-xs text-muted">Legge automaticamente le risposte</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assistente Vocale Conversazionale */}
          <Card className="lg:col-span-2">
            <CardContent>
              <div className="flex items-center gap-2 mb-5">
                <Phone className="h-4 w-4 text-cyan-400" />
                <CardTitle>Assistente Vocale (Giusy)</CardTitle>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">Abilita assistente vocale</p>
                    <p className="text-xs text-muted">
                      {voiceAgentEnabled
                        ? 'Gli utenti possono parlare con Giusy tramite il pulsante microfono'
                        : 'L\'assistente vocale è disabilitato'}
                    </p>
                  </div>
                  <button
                    onClick={() => setVoiceAgentEnabled(!voiceAgentEnabled)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      voiceAgentEnabled ? 'bg-cyan-500' : 'bg-secondary',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      voiceAgentEnabled && 'translate-x-5',
                    )} />
                  </button>
                </div>

                {voiceAgentEnabled && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Agent ID (ElevenLabs)</label>
                    <input
                      type="text"
                      value={voiceAgentId}
                      onChange={e => setVoiceAgentId(e.target.value)}
                      className="w-full rounded-lg border border-border/40 bg-secondary/30 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                      placeholder="agent_xxxxxxxx"
                    />
                    <p className="text-xs text-muted mt-1.5">
                      ID dell&apos;agente configurato su ElevenLabs Conversational AI
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Tool */}
      {activeTab === 'tools' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">
              {enabledTools.length === 0
                ? `Tutti i ${tools.length} tool sono abilitati`
                : `${enabledCount} di ${tools.length} tool abilitati`}
            </p>
            {enabledTools.length > 0 && (
              <button
                onClick={() => setEnabledTools([])}
                className="text-xs text-primary hover:underline"
              >
                Abilita tutti
              </button>
            )}
          </div>

          <div className="space-y-3">
            {Object.entries(toolsByModule).map(([mod, modTools]) => {
              const meta = MODULE_LABELS[mod] || { label: mod, icon: Wrench, color: 'text-muted' }
              const ModIcon = meta.icon
              const isExpanded = expandedModules[mod] ?? true
              const enabledInModule = modTools.filter(t => enabledTools.length === 0 || enabledTools.includes(t.name)).length

              return (
                <Card key={mod}>
                  <CardContent>
                    <button
                      onClick={() => setExpandedModules(prev => ({ ...prev, [mod]: !isExpanded }))}
                      className="flex items-center justify-between w-full text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg bg-secondary/50', meta.color)}>
                          <ModIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{meta.label}</p>
                          <p className="text-xs text-muted">{enabledInModule}/{modTools.length} tool attivi</p>
                        </div>
                      </div>
                      <div className="text-muted group-hover:text-foreground transition-colors">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                        {modTools.map(tool => {
                          const isOn = enabledTools.length === 0 || enabledTools.includes(tool.name)
                          return (
                            <label
                              key={tool.name}
                              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors"
                            >
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); toggleTool(tool.name) }}
                                  className={cn(
                                    'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                                    isOn
                                      ? 'bg-primary border-primary'
                                      : 'border-border hover:border-primary/50',
                                  )}
                                >
                                  {isOn && <Check className="h-3 w-3 text-primary-foreground" />}
                                </button>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium font-mono">{tool.name}</p>
                                <p className="text-xs text-muted mt-0.5 leading-relaxed">{tool.description}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab: Prompt & Messaggi */}
      {activeTab === 'prompts' && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <CardTitle>System Prompt personalizzato</CardTitle>
              </div>
              <p className="text-xs text-muted mb-3">
                Aggiunto in coda al prompt base. Lascia vuoto per usare solo il default.
              </p>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-border/40 bg-secondary/30 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-y transition-all"
                placeholder="Istruzioni aggiuntive per l'agente..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <CardTitle>Messaggio di benvenuto</CardTitle>
              </div>
              <p className="text-xs text-muted mb-3">
                Mostrato quando l&apos;utente apre la chat AI. Lascia vuoto per il messaggio predefinito.
              </p>
              <textarea
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border/40 bg-secondary/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-y transition-all"
                placeholder="Ciao! Sono il tuo assistente AI. Come posso aiutarti?"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
