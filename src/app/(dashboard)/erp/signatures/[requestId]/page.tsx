'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send, FileText, Trash2, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { SignatureStatusBadge } from '@/components/erp/SignatureStatusBadge'
import { SignatureAuditTimeline } from '@/components/erp/SignatureAuditTimeline'

interface SignatureDetail {
  id: string
  documentType: string
  documentTitle: string
  documentUrl: string
  signedPdfUrl: string | null
  signerName: string
  signerEmail: string
  signerPhone: string | null
  status: string
  expiresAt: string
  signedAt: string | null
  declineReason: string | null
  message: string | null
  accessToken: string
  createdAt: string
  requester: { id: string; firstName: string; lastName: string; email: string }
  signerClient: { id: string; companyName: string } | null
  otpAttempts: {
    id: string; channel: string; sentTo: string; expiresAt: string;
    isUsed: boolean; attempts: number; createdAt: string
  }[]
  auditTrail: {
    id: string; action: string; ipAddress: string | null;
    userAgent: string | null; metadata: Record<string, unknown> | null; createdAt: string
  }[]
}

const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTE: 'Preventivo', CONTRACT: 'Contratto', CUSTOM: 'Altro',
}

export default function SignatureDetailPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.requestId as string

  const [data, setData] = useState<SignatureDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/signatures/${requestId}`)
      if (res.ok) {
        setData(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSendOtp = async () => {
    setSendingOtp(true)
    try {
      const res = await fetch(`/api/signatures/${requestId}/send-otp`, { method: 'POST' })
      if (res.ok) {
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || 'Errore invio OTP')
      }
    } finally {
      setSendingOtp(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Sei sicuro di voler annullare questa richiesta?')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/signatures/${requestId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || 'Errore annullamento')
      }
    } finally {
      setCancelling(false)
    }
  }

  const signPageUrl = data ? `${window.location.origin}/sign/${data.accessToken}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(signPageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="animate-fade-in">
        <Button variant="ghost" onClick={() => router.push('/erp/signatures')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Torna alle firme
        </Button>
        <p className="text-center text-muted mt-8">Richiesta non trovata.</p>
      </div>
    )
  }

  const isActive = !['SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(data.status)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/erp/signatures')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold truncate">{data.documentTitle}</h1>
            <SignatureStatusBadge status={data.status} />
          </div>
          <p className="text-xs text-muted">{DOC_TYPE_LABELS[data.documentType] || data.documentType}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent>
              <CardTitle className="mb-4">Informazioni Firmatario</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted text-xs">Nome</p>
                  <p className="font-medium">{data.signerName}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Email</p>
                  <p className="font-medium">{data.signerEmail}</p>
                </div>
                {data.signerPhone && (
                  <div>
                    <p className="text-muted text-xs">Telefono</p>
                    <p className="font-medium">{data.signerPhone}</p>
                  </div>
                )}
                {data.signerClient && (
                  <div>
                    <p className="text-muted text-xs">Azienda</p>
                    <p className="font-medium">{data.signerClient.companyName}</p>
                  </div>
                )}
              </div>

              {data.message && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <p className="text-muted text-xs mb-1">Messaggio</p>
                  <p className="text-sm">{data.message}</p>
                </div>
              )}

              {data.declineReason && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <p className="text-muted text-xs mb-1">Motivo rifiuto</p>
                  <p className="text-sm text-destructive">{data.declineReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link firma */}
          <Card>
            <CardContent>
              <CardTitle className="mb-3">Link Firma Pubblica</CardTitle>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary/50 rounded-lg px-3 py-2 truncate">{signPageUrl}</code>
                <Button variant="outline" size="icon" onClick={copyLink} title="Copia link">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => window.open(signPageUrl, '_blank')} title="Apri in nuova tab">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-emerald-500 mt-1">Link copiato!</p>}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent>
              <CardTitle className="mb-3">Documenti</CardTitle>
              <div className="space-y-2">
                <a href={data.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <FileText className="h-4 w-4" /> PDF Originale
                </a>
                {data.signedPdfUrl && (
                  <a href={data.signedPdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-600 hover:underline">
                    <FileText className="h-4 w-4" /> PDF Firmato
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isActive && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSendOtp} loading={sendingOtp} size="sm">
                <Send className="h-4 w-4 mr-1.5" />
                Invia OTP via Email
              </Button>
              <Button variant="destructive" onClick={handleCancel} loading={cancelling} size="sm">
                <Trash2 className="h-4 w-4 mr-1.5" />
                Annulla Richiesta
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar: audit + info */}
        <div className="space-y-6">
          <Card>
            <CardContent>
              <CardTitle className="mb-3">Dettagli</CardTitle>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted text-xs">Stato</p>
                  <SignatureStatusBadge status={data.status} />
                </div>
                <div>
                  <p className="text-muted text-xs">Richiedente</p>
                  <p>{data.requester.firstName} {data.requester.lastName}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Creato il</p>
                  <p>{new Date(data.createdAt).toLocaleString('it-IT')}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Scadenza</p>
                  <p>{new Date(data.expiresAt).toLocaleString('it-IT')}</p>
                </div>
                {data.signedAt && (
                  <div>
                    <p className="text-muted text-xs">Firmato il</p>
                    <p className="text-emerald-600 font-medium">{new Date(data.signedAt).toLocaleString('it-IT')}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted text-xs">OTP inviati</p>
                  <p>{data.otpAttempts.length} / 3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <CardTitle className="mb-3">Audit Trail</CardTitle>
              <SignatureAuditTimeline entries={data.auditTrail} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
