
'use client'
import { brandClient } from '@/lib/branding-client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, Send, Shield, ExternalLink } from 'lucide-react'
import { OtpInput } from '@/components/sign/OtpInput'

interface CompanyInfo {
  ragioneSociale: string
  partitaIva: string
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  pec: string | null
  siteUrl: string | null
  logoUrl: string | null
}

interface SignatureInfo {
  id: string
  documentType: string
  documentTitle: string
  documentUrl: string
  signedPdfUrl: string | null
  signerName: string
  signerEmail: string
  status: string
  expiresAt: string
  signedAt: string | null
  declineReason: string | null
  message: string | null
  createdAt: string
  requester: { firstName: string; lastName: string }
  signerClient: { companyName: string } | null
  company: CompanyInfo | null
}

type Step = 'loading' | 'view' | 'otp' | 'signed' | 'declined' | 'expired' | 'cancelled' | 'error'

export default function SignPage() {
  const params = useParams()
  const token = params.token as string

  const [step, setStep] = useState<Step>('loading')
  const [info, setInfo] = useState<SignatureInfo | null>(null)
  const [error, setError] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [loadingAction, setLoadingAction] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showDecline, setShowDecline] = useState(false)

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/sign/${token}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Errore nel caricamento')
        setStep('error')
        return
      }
      const data: SignatureInfo = await res.json()
      setInfo(data)

      if (data.status === 'SIGNED') setStep('signed')
      else if (data.status === 'DECLINED') setStep('declined')
      else if (data.status === 'EXPIRED') setStep('expired')
      else if (data.status === 'CANCELLED') setStep('cancelled')
      else setStep('view')
    } catch {
      setError('Errore di connessione')
      setStep('error')
    }
  }, [token])

  useEffect(() => { fetchInfo() }, [fetchInfo])

  const requestOtp = async () => {
    setLoadingAction(true)
    setError('')
    try {
      const res = await fetch(`/api/sign/${token}/request-otp`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore invio OTP')
        return
      }
      setMaskedEmail(data.maskedEmail || '')
      setStep('otp')
      setOtpValue('')
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoadingAction(false)
    }
  }

  const verifyOtp = async () => {
    if (otpValue.length !== 6) return
    setLoadingAction(true)
    setError('')
    try {
      const res = await fetch(`/api/sign/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpValue }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Codice non valido')
        setOtpValue('')
        return
      }
      setStep('signed')
      fetchInfo()
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoadingAction(false)
    }
  }

  const declineSign = async () => {
    setLoadingAction(true)
    setError('')
    try {
      const res = await fetch(`/api/sign/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore')
        return
      }
      setStep('declined')
      fetchInfo()
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoadingAction(false)
    }
  }

  const company = info?.company

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header with logo */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {company?.logoUrl ? (
            <Image src={company.logoUrl} alt={company.ragioneSociale} width={120} height={40} className="h-10 w-auto max-w-[120px] object-contain" unoptimized />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">{company?.ragioneSociale || brandClient.name}</p>
            <p className="text-xs text-slate-500">Firma Digitale Sicura</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">

          {/* Loading */}
          {step === 'loading' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center animate-pulse">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-slate-100" />
              <div className="h-5 w-48 mx-auto bg-slate-100 rounded" />
              <div className="h-4 w-32 mx-auto mt-2 bg-slate-100 rounded" />
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Errore</h2>
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          )}

          {/* Expired */}
          {step === 'expired' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Richiesta Scaduta</h2>
              <p className="text-sm text-slate-600">Questa richiesta di firma e scaduta. Contatta il mittente per una nuova richiesta.</p>
            </div>
          )}

          {/* Cancelled */}
          {step === 'cancelled' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <XCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Richiesta Annullata</h2>
              <p className="text-sm text-slate-600">Questa richiesta di firma e stata annullata dal mittente.</p>
            </div>
          )}

          {/* Declined */}
          {step === 'declined' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Firma Rifiutata</h2>
              <p className="text-sm text-slate-600">Hai rifiutato la firma di questo documento.</p>
              {info?.declineReason && (
                <p className="text-sm text-slate-500 mt-2">Motivo: {info.declineReason}</p>
              )}
            </div>
          )}

          {/* Signed */}
          {step === 'signed' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Documento Firmato</h2>
              <p className="text-sm text-slate-600 mb-1">
                <strong>{info?.documentTitle}</strong>
              </p>
              {info?.signedAt && (
                <p className="text-xs text-slate-500">
                  Firmato il {new Date(info.signedAt).toLocaleString('it-IT')}
                </p>
              )}
              {info?.signedPdfUrl && (
                <a
                  href={info.signedPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <FileText className="h-4 w-4" />
                  Scarica PDF Firmato
                </a>
              )}
            </div>
          )}

          {/* View document - initial state */}
          {step === 'view' && info && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-center mb-6">
                  <FileText className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
                  <h2 className="text-lg font-semibold text-slate-900">{info.documentTitle}</h2>
                  {info.signerClient && (
                    <p className="text-sm text-slate-500">{info.signerClient.companyName}</p>
                  )}
                </div>

                {info.message && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <p className="text-xs text-slate-500 mb-1">Messaggio da {info.requester.firstName} {info.requester.lastName}:</p>
                    <p className="text-sm text-slate-700">{info.message}</p>
                  </div>
                )}

                <div className="text-sm text-slate-600 space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Firmatario</span>
                    <span className="font-medium">{info.signerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scadenza</span>
                    <span>{new Date(info.expiresAt).toLocaleDateString('it-IT')}</span>
                  </div>
                </div>

                {/* PDF preview embed */}
                {info.documentUrl && (
                  <div className="mb-4">
                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50" style={{ height: '400px' }}>
                      <iframe
                        src={info.documentUrl}
                        className="w-full h-full"
                        title="Anteprima documento"
                      />
                    </div>
                    <a
                      href={info.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 mt-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Apri in una nuova scheda
                    </a>
                  </div>
                )}

                <button
                  onClick={requestOtp}
                  disabled={loadingAction}
                  className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingAction ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Firma con OTP
                </button>

                {error && <p className="text-sm text-red-600 text-center mt-3">{error}</p>}
              </div>

              {/* Legal note */}
              <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4">
                <p className="text-xs text-indigo-800/70 leading-relaxed">
                  <strong>Informativa:</strong> La firma con OTP (One-Time Password) ha valore legale ai sensi del
                  Regolamento eIDAS (UE 910/2014) e del CAD (D.Lgs. 82/2005). Ogni operazione viene registrata
                  con indirizzo IP, timestamp e hash crittografico del documento.
                </p>
              </div>

              {/* Decline section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                {!showDecline ? (
                  <button
                    onClick={() => setShowDecline(true)}
                    className="w-full text-sm text-slate-500 hover:text-red-600 transition-colors text-center py-1"
                  >
                    Rifiuta la firma
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Rifiuta firma</p>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      placeholder="Motivo del rifiuto (opzionale)..."
                      rows={2}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDecline(false)}
                        className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={declineSign}
                        disabled={loadingAction}
                        className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Conferma Rifiuto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OTP verification step */}
          {step === 'otp' && info && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="text-center mb-6">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Inserisci il Codice OTP</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Abbiamo inviato un codice a 6 cifre a <strong>{maskedEmail}</strong>
                </p>
              </div>

              <div className="mb-6">
                <OtpInput
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={loadingAction}
                />
              </div>

              {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}

              <button
                onClick={verifyOtp}
                disabled={loadingAction || otpValue.length !== 6}
                className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAction ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Verifica e Firma
              </button>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => { setStep('view'); setError('') }}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Indietro
                </button>
                <button
                  onClick={requestOtp}
                  disabled={loadingAction}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors disabled:opacity-50"
                >
                  Rinvia Codice
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer with company data */}
      <footer className="border-t border-slate-200 bg-white/60 py-4">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-1">
          {company && (
            <p className="text-xs text-slate-500">
              {company.ragioneSociale} - {company.indirizzo}, {company.cap} {company.citta} ({company.provincia}) - P.IVA: {company.partitaIva}
              {company.pec && ` - PEC: ${company.pec}`}
              {company.siteUrl && ` - ${company.siteUrl}`}
            </p>
          )}
          <p className="text-xs text-slate-400">
            Firma protetta con verifica OTP e audit trail immutabile.
            Ogni azione viene registrata con indirizzo IP e timestamp.
          </p>
        </div>
      </footer>
    </div>
  )
}
