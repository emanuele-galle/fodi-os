'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Building2 } from 'lucide-react'

interface CompanyProfile {
  id?: string
  ragioneSociale: string
  partitaIva: string
  codiceFiscale: string
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  nazione: string
  regimeFiscale: string
  iban: string
  pec: string
  telefono: string
  email: string
}

const EMPTY_PROFILE: CompanyProfile = {
  ragioneSociale: '',
  partitaIva: '',
  codiceFiscale: '',
  indirizzo: '',
  cap: '',
  citta: '',
  provincia: '',
  nazione: 'IT',
  regimeFiscale: 'RF01',
  iban: '',
  pec: '',
  telefono: '',
  email: '',
}

const REGIMI_FISCALI = [
  { value: 'RF01', label: 'RF01 - Ordinario' },
  { value: 'RF02', label: 'RF02 - Contribuenti minimi' },
  { value: 'RF04', label: 'RF04 - Agricoltura e pesca' },
  { value: 'RF05', label: 'RF05 - Vendita sali e tabacchi' },
  { value: 'RF06', label: 'RF06 - Commercio fiammiferi' },
  { value: 'RF07', label: 'RF07 - Editoria' },
  { value: 'RF08', label: 'RF08 - Gestione servizi telefonici' },
  { value: 'RF09', label: 'RF09 - Rivendita doc. di trasporto' },
  { value: 'RF10', label: 'RF10 - Intrattenimenti e giochi' },
  { value: 'RF11', label: 'RF11 - Agenzie viaggi e turismo' },
  { value: 'RF12', label: 'RF12 - Agriturismo' },
  { value: 'RF13', label: 'RF13 - Vendite a domicilio' },
  { value: 'RF14', label: 'RF14 - Rivendita beni usati' },
  { value: 'RF15', label: 'RF15 - Agenzie di vendite all\'asta' },
  { value: 'RF16', label: 'RF16 - IVA per cassa P.A.' },
  { value: 'RF17', label: 'RF17 - IVA per cassa' },
  { value: 'RF18', label: 'RF18 - Altro' },
  { value: 'RF19', label: 'RF19 - Forfettario' },
]

export default function BillingSettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/erp/company-profile')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setProfile({
            ...EMPTY_PROFILE,
            ...data,
            codiceFiscale: data.codiceFiscale || '',
            iban: data.iban || '',
            pec: data.pec || '',
            telefono: data.telefono || '',
            email: data.email || '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/erp/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile((prev) => ({ ...prev, id: data.id }))
        setMessage('Profilo azienda salvato con successo')
      } else {
        const err = await res.json()
        setMessage(err.error || 'Errore nel salvataggio')
      }
    } catch {
      setMessage('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Fatturazione</h1>
          <p className="text-sm text-muted">Profilo azienda e dati fiscali</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.includes('successo')
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          {message}
        </div>
      )}

      <Card>
        <CardTitle>Profilo Azienda (CedentePrestatore)</CardTitle>
        <CardContent>
          <p className="text-sm text-muted mb-4">
            Questi dati vengono usati per generare le fatture elettroniche in formato FatturaPA.
          </p>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              id="ragioneSociale"
              label="Ragione Sociale *"
              value={profile.ragioneSociale}
              onChange={(e) => setProfile({ ...profile, ragioneSociale: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="partitaIva"
                label="Partita IVA *"
                value={profile.partitaIva}
                onChange={(e) => setProfile({ ...profile, partitaIva: e.target.value })}
                required
                maxLength={11}
              />
              <Input
                id="codiceFiscale"
                label="Codice Fiscale"
                value={profile.codiceFiscale}
                onChange={(e) => setProfile({ ...profile, codiceFiscale: e.target.value })}
                maxLength={16}
              />
            </div>

            <Input
              id="indirizzo"
              label="Indirizzo *"
              value={profile.indirizzo}
              onChange={(e) => setProfile({ ...profile, indirizzo: e.target.value })}
              required
            />

            <div className="grid grid-cols-3 gap-4">
              <Input
                id="cap"
                label="CAP *"
                value={profile.cap}
                onChange={(e) => setProfile({ ...profile, cap: e.target.value })}
                required
                maxLength={5}
              />
              <Input
                id="citta"
                label="Citta *"
                value={profile.citta}
                onChange={(e) => setProfile({ ...profile, citta: e.target.value })}
                required
              />
              <Input
                id="provincia"
                label="Provincia *"
                value={profile.provincia}
                onChange={(e) => setProfile({ ...profile, provincia: e.target.value.toUpperCase() })}
                required
                maxLength={2}
                placeholder="es. MI"
              />
            </div>

            <Select
              name="regimeFiscale"
              label="Regime Fiscale"
              value={profile.regimeFiscale}
              onChange={(e) => setProfile({ ...profile, regimeFiscale: e.target.value })}
              options={REGIMI_FISCALI}
            />

            <Input
              id="iban"
              label="IBAN"
              value={profile.iban}
              onChange={(e) => setProfile({ ...profile, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
              placeholder="IT..."
              maxLength={27}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="pec"
                label="PEC"
                type="email"
                value={profile.pec}
                onChange={(e) => setProfile({ ...profile, pec: e.target.value })}
              />
              <Input
                id="email"
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <Input
              id="telefono"
              label="Telefono"
              value={profile.telefono}
              onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvataggio...' : 'Salva Profilo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
