'use client'

import { Select } from '@/components/ui/Select'

const CRM_MAPPING_OPTIONS = [
  { value: '', label: 'Nessun mapping' },
  { value: 'client.companyName', label: 'Cliente - Ragione Sociale' },
  { value: 'client.vatNumber', label: 'Cliente - P. IVA' },
  { value: 'client.fiscalCode', label: 'Cliente - Codice Fiscale' },
  { value: 'client.pec', label: 'Cliente - PEC' },
  { value: 'client.sdi', label: 'Cliente - SDI' },
  { value: 'client.website', label: 'Cliente - Sito web' },
  { value: 'client.industry', label: 'Cliente - Settore' },
  { value: 'client.source', label: 'Cliente - Origine' },
  { value: 'client.notes', label: 'Cliente - Note' },
  { value: 'contact.firstName', label: 'Contatto - Nome' },
  { value: 'contact.lastName', label: 'Contatto - Cognome' },
  { value: 'contact.email', label: 'Contatto - Email' },
  { value: 'contact.phone', label: 'Contatto - Telefono' },
  { value: 'contact.role', label: 'Contatto - Ruolo' },
  { value: 'contact.notes', label: 'Contatto - Note' },
]

interface CrmMappingEditorProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function CrmMappingEditor({ value, onChange }: CrmMappingEditorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1 block">Mapping CRM</label>
      <Select
        options={CRM_MAPPING_OPTIONS}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      />
      <p className="text-xs text-muted mt-1">
        Collega questo campo a una proprieta del CRM per importare automaticamente i dati
      </p>
    </div>
  )
}
