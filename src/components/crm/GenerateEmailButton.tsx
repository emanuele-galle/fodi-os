'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Sparkles, Loader2, Copy, Check } from 'lucide-react'

interface GenerateEmailButtonProps {
  clientId: string
}

const SCENARIO_OPTIONS = [
  { value: 'followup', label: 'Follow-up' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'thank_you', label: 'Ringraziamento' },
  { value: 'project_update', label: 'Aggiornamento Progetto' },
  { value: 'custom', label: 'Personalizzato' },
]

export function GenerateEmailButton({ clientId }: GenerateEmailButtonProps) {
  const [open, setOpen] = useState(false)
  const [scenario, setScenario] = useState('followup')
  const [customPrompt, setCustomPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ subject: string; bodyHtml: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/crm/email-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          scenario,
          customPrompt: scenario === 'custom' ? customPrompt : undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.data) setResult(data.data)
    } finally { setLoading(false) }
  }, [clientId, scenario, customPrompt])

  const handleCopy = useCallback(async () => {
    if (!result) return
    const text = `Oggetto: ${result.subject}\n\n${result.bodyHtml.replace(/<[^>]*>/g, '')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const handleOpen = useCallback(() => { setOpen(true); setResult(null) }, [])
  const handleClose = useCallback(() => setOpen(false), [])
  const handleScenarioChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setScenario(e.target.value), [])
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value), [])

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Sparkles className="h-4 w-4 mr-1.5" />
        Genera Email
      </Button>

      <Modal open={open} onClose={handleClose} title="Genera Email AI" size="lg">
        <div className="space-y-4">
          <Select label="Scenario" options={SCENARIO_OPTIONS} value={scenario} onChange={handleScenarioChange} />

          {scenario === 'custom' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Prompt personalizzato</label>
              <textarea
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[80px]"
                value={customPrompt}
                onChange={handlePromptChange}
                placeholder="Descrivi il tipo di email da generare..."
              />
            </div>
          )}

          <Button onClick={handleGenerate} disabled={loading || (scenario === 'custom' && !customPrompt.trim())}>
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            Genera
          </Button>

          {result && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Oggetto: {result.subject}</p>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: result.bodyHtml }} />
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
