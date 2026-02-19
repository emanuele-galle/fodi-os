'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRightLeft, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface ClientFull {
  id: string
  companyName: string
  slug: string
  vatNumber: string | null
  fiscalCode: string | null
  pec: string | null
  sdi: string | null
  website: string | null
  industry: string | null
  source: string | null
  status: string
  notes: string | null
  tags: string[]
  totalRevenue: number
  createdAt: string
  _count: {
    contacts: number
    interactions: number
    projects: number
    quotes: number
    tickets: number
    documents: number
    quoteTemplates: number
    signatureRequests: number
    tasks: number
    deals: number
  }
}

const MERGEABLE_FIELDS = [
  { key: 'companyName', label: 'Ragione Sociale' },
  { key: 'vatNumber', label: 'P.IVA' },
  { key: 'fiscalCode', label: 'Codice Fiscale' },
  { key: 'pec', label: 'PEC' },
  { key: 'sdi', label: 'SDI' },
  { key: 'website', label: 'Sito Web' },
  { key: 'industry', label: 'Settore' },
  { key: 'source', label: 'Origine' },
  { key: 'status', label: 'Stato' },
  { key: 'notes', label: 'Note' },
] as const

const RELATIONS = [
  { key: 'contacts', label: 'Contatti' },
  { key: 'interactions', label: 'Interazioni' },
  { key: 'projects', label: 'Progetti' },
  { key: 'quotes', label: 'Preventivi' },
  { key: 'tickets', label: 'Ticket' },
  { key: 'documents', label: 'Documenti' },
  { key: 'quoteTemplates', label: 'Template Preventivi' },
  { key: 'signatureRequests', label: 'Richieste Firma' },
  { key: 'tasks', label: 'Attivita' },
  { key: 'deals', label: 'Trattative' },
] as const

export default function MergePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sourceId = searchParams.get('source')
  const targetId = searchParams.get('target')

  const [source, setSource] = useState<ClientFull | null>(null)
  const [target, setTarget] = useState<ClientFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { confirm, confirmProps } = useConfirm()

  const [fields, setFields] = useState<Record<string, 'source' | 'target'>>(() => {
    const initial: Record<string, 'source' | 'target'> = {}
    for (const f of MERGEABLE_FIELDS) initial[f.key] = 'target'
    return initial
  })

  const [mergeRelations, setMergeRelations] = useState<Set<string>>(() =>
    new Set(RELATIONS.map(r => r.key))
  )

  useEffect(() => {
    if (!sourceId || !targetId) {
      setError('Parametri mancanti: source e target sono obbligatori')
      setLoading(false)
      return
    }

    async function fetchClients() {
      try {
        const [srcRes, tgtRes] = await Promise.all([
          fetch(`/api/clients/${sourceId}`),
          fetch(`/api/clients/${targetId}`),
        ])
        if (!srcRes.ok || !tgtRes.ok) {
          setError('Impossibile caricare uno o entrambi i clienti')
          return
        }
        const srcData = await srcRes.json()
        const tgtData = await tgtRes.json()
        setSource(srcData.data || srcData)
        setTarget(tgtData.data || tgtData)
      } catch {
        setError('Errore nel caricamento dei clienti')
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [sourceId, targetId])

  function toggleField(key: string) {
    setFields(prev => ({ ...prev, [key]: prev[key] === 'source' ? 'target' : 'source' }))
  }

  function toggleRelation(key: string) {
    setMergeRelations(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function getFieldValue(client: ClientFull | null, key: string): string {
    if (!client) return '-'
    const val = (client as unknown as Record<string, unknown>)[key]
    if (val === null || val === undefined || val === '') return '-'
    return String(val)
  }

  async function handleMerge() {
    const ok = await confirm({ message: 'Sei sicuro? Il cliente sorgente verra eliminato e tutti i dati selezionati saranno trasferiti al cliente destinazione. Questa azione non puo essere annullata.', variant: 'danger' })
    if (!ok) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/clients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          targetId,
          fields,
          mergeRelations: Array.from(mergeRelations),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Errore durante l\'unione')
        return
      }

      router.push(`/crm/${targetId}`)
    } catch {
      setError('Errore di rete durante l\'unione')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error && (!source || !target)) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/crm')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Torna al CRM
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/crm')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Indietro
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Unisci Clienti</h1>
          <p className="text-sm text-muted">Seleziona i valori da mantenere per ogni campo</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Client Headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Sorgente (verra eliminato)</p>
                <p className="font-semibold text-lg">{source?.companyName}</p>
              </div>
              <Badge variant="destructive">Eliminato</Badge>
            </div>
          </CardContent>
        </Card>

        <ArrowRightLeft className="h-5 w-5 text-muted" />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Destinazione (mantenuto)</p>
                <p className="font-semibold text-lg">{target?.companyName}</p>
              </div>
              <Badge variant="default">Mantenuto</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fields Selection */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border/30">
            <h2 className="font-medium">Campi</h2>
            <p className="text-xs text-muted">Clicca su un valore per selezionarlo</p>
          </div>
          <div className="divide-y divide-border/20">
            {MERGEABLE_FIELDS.map(({ key, label }) => {
              const srcVal = getFieldValue(source, key)
              const tgtVal = getFieldValue(target, key)
              const selected = fields[key]
              return (
                <div key={key} className="grid grid-cols-[1fr_8rem_1fr] items-center">
                  <button
                    type="button"
                    className={`px-4 py-3 text-left text-sm transition-colors ${
                      selected === 'source'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/30'
                    }`}
                    onClick={() => setFields(prev => ({ ...prev, [key]: 'source' }))}
                  >
                    <span className="truncate block">{srcVal}</span>
                    {selected === 'source' && <Check className="h-3 w-3 inline ml-1" />}
                  </button>
                  <div className="text-center text-xs text-muted font-medium">{label}</div>
                  <button
                    type="button"
                    className={`px-4 py-3 text-left text-sm transition-colors ${
                      selected === 'target'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/30'
                    }`}
                    onClick={() => setFields(prev => ({ ...prev, [key]: 'target' }))}
                  >
                    <span className="truncate block">{tgtVal}</span>
                    {selected === 'target' && <Check className="h-3 w-3 inline ml-1" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Tags */}
          <div className="px-4 py-3 border-t border-border/30">
            <p className="text-xs text-muted mb-2">Tag (unione automatica)</p>
            <div className="flex flex-wrap gap-1">
              {[...new Set([...(source?.tags || []), ...(target?.tags || [])])].map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
              {[...(source?.tags || []), ...(target?.tags || [])].length === 0 && (
                <span className="text-xs text-muted">Nessun tag</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relations */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border/30">
            <h2 className="font-medium">Relazioni da trasferire</h2>
            <p className="text-xs text-muted">Seleziona quali relazioni spostare dal sorgente al destinazione</p>
          </div>
          <div className="divide-y divide-border/20">
            {RELATIONS.map(({ key, label }) => {
              const srcCount = source?._count?.[key as keyof ClientFull['_count']] ?? 0
              const tgtCount = target?._count?.[key as keyof ClientFull['_count']] ?? 0
              return (
                <label key={key} className="flex items-center px-4 py-3 hover:bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeRelations.has(key)}
                    onChange={() => toggleRelation(key)}
                    className="rounded border-border mr-3"
                  />
                  <span className="text-sm flex-1">{label}</span>
                  <span className="text-xs text-muted">
                    Sorgente: {srcCount} | Destinazione: {tgtCount}
                  </span>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => router.push('/crm')}>
          Annulla
        </Button>
        <Button
          variant="destructive"
          onClick={handleMerge}
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Unione in corso...</>
          ) : (
            'Conferma Unione'
          )}
        </Button>
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
