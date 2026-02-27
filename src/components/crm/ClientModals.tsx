'use client'

import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { INTERACTION_TYPES, STATUS_OPTIONS, INDUSTRY_OPTIONS, SOURCE_OPTIONS } from '@/lib/crm-constants'
import type { Contact } from './types'

/* ============ ADD CONTACT MODAL ============ */
interface AddContactModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
}

export function AddContactModal({ open, onClose, onSubmit, submitting }: AddContactModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Aggiungi Contatto" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input name="firstName" label="Nome *" required />
          <Input name="lastName" label="Cognome *" required />
        </div>
        <Input name="email" label="Email" type="email" />
        <Input name="phone" label="Telefono" />
        <Input name="role" label="Ruolo" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Note</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Note sul contatto..."
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPrimary" className="rounded border-border" />
          Contatto principale
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" loading={submitting}>Aggiungi</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ============ ADD INTERACTION MODAL ============ */
interface AddInteractionModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
  contacts: Contact[]
}

export function AddInteractionModal({ open, onClose, onSubmit, submitting, contacts }: AddInteractionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Nuova Interazione" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <Select name="type" label="Tipo *" options={INTERACTION_TYPES} />
        <Input name="subject" label="Oggetto *" required />
        {contacts.length > 0 && (
          <Select
            name="contactId"
            label="Contatto"
            options={[
              { value: '', label: 'Nessun contatto specifico' },
              ...contacts.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.role ? ` - ${c.role}` : ''}` }))
            ]}
          />
        )}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Contenuto</label>
          <textarea
            name="content"
            rows={4}
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" loading={submitting}>Aggiungi</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ============ EDIT CLIENT MODAL ============ */
interface EditClientModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
  editForm: {
    companyName: string; vatNumber: string; fiscalCode: string; pec: string; sdi: string
    website: string; industry: string; source: string; status: string; notes: string; tags: string
  }
  setEditForm: React.Dispatch<React.SetStateAction<EditClientModalProps['editForm']>>
}

export function EditClientModal({ open, onClose, onSubmit, submitting, editForm, setEditForm }: EditClientModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Modifica Cliente" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Ragione Sociale *" required value={editForm.companyName} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="P.IVA" value={editForm.vatNumber} onChange={e => setEditForm(f => ({ ...f, vatNumber: e.target.value }))} />
          <Input label="Codice Fiscale" value={editForm.fiscalCode} onChange={e => setEditForm(f => ({ ...f, fiscalCode: e.target.value }))} />
          <Input label="PEC" type="email" value={editForm.pec} onChange={e => setEditForm(f => ({ ...f, pec: e.target.value }))} />
          <Input label="Codice SDI" value={editForm.sdi} onChange={e => setEditForm(f => ({ ...f, sdi: e.target.value }))} />
          <Input label="Sito Web" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
          <Input label="Tags (separati da virgola)" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Settore" options={INDUSTRY_OPTIONS} value={editForm.industry} onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} />
          <Select label="Fonte" options={SOURCE_OPTIONS} value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} />
        </div>
        <Select label="Stato" options={STATUS_OPTIONS.filter(o => o.value !== '')} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Note</label>
          <textarea rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" loading={submitting}>Salva Modifiche</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ============ DELETE CLIENT MODAL ============ */
interface DeleteClientModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  submitting: boolean
  companyName: string
}

export function DeleteClientModal({ open, onClose, onConfirm, submitting, companyName }: DeleteClientModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Elimina Cliente" size="sm">
      <p className="text-sm text-muted mb-4">
        Sei sicuro di voler eliminare <strong>{companyName}</strong>? Verranno eliminati tutti i contatti, interazioni e dati associati. Questa azione non può essere annullata.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button variant="destructive" onClick={onConfirm} loading={submitting}>Elimina</Button>
      </div>
    </Modal>
  )
}

/* ============ EDIT CONTACT MODAL ============ */
interface EditContactModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
  editContactForm: {
    firstName: string; lastName: string; email: string; phone: string; role: string; isPrimary: boolean; notes: string
  }
  setEditContactForm: React.Dispatch<React.SetStateAction<EditContactModalProps['editContactForm']>>
}

export function EditContactModal({ open, onClose, onSubmit, submitting, editContactForm, setEditContactForm }: EditContactModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Modifica Contatto" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome *" required value={editContactForm.firstName} onChange={e => setEditContactForm(f => ({ ...f, firstName: e.target.value }))} />
          <Input label="Cognome *" required value={editContactForm.lastName} onChange={e => setEditContactForm(f => ({ ...f, lastName: e.target.value }))} />
        </div>
        <Input label="Email" type="email" value={editContactForm.email} onChange={e => setEditContactForm(f => ({ ...f, email: e.target.value }))} />
        <Input label="Telefono" value={editContactForm.phone} onChange={e => setEditContactForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label="Ruolo" value={editContactForm.role} onChange={e => setEditContactForm(f => ({ ...f, role: e.target.value }))} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Note</label>
          <textarea
            rows={2}
            value={editContactForm.notes}
            onChange={e => setEditContactForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Note sul contatto..."
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editContactForm.isPrimary} onChange={e => setEditContactForm(f => ({ ...f, isPrimary: e.target.checked }))} className="rounded border-border" />
          Contatto principale
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" loading={submitting}>Salva</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ============ DELETE CONTACT MODAL ============ */
interface DeleteContactModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  submitting: boolean
}

export function DeleteContactModal({ open, onClose, onConfirm, submitting }: DeleteContactModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Elimina Contatto" size="sm">
      <p className="text-sm text-muted mb-4">Sei sicuro di voler eliminare questo contatto? L&apos;azione non può essere annullata.</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button variant="destructive" onClick={onConfirm} loading={submitting}>Elimina</Button>
      </div>
    </Modal>
  )
}

/* ============ EDIT INTERACTION MODAL ============ */
interface EditInteractionModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
  editInteractionForm: {
    type: string; subject: string; content: string; contactId: string; date: string
  }
  setEditInteractionForm: React.Dispatch<React.SetStateAction<EditInteractionModalProps['editInteractionForm']>>
  contacts: Contact[]
}

export function EditInteractionModal({ open, onClose, onSubmit, submitting, editInteractionForm, setEditInteractionForm, contacts }: EditInteractionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Modifica Interazione" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <Select
          label="Tipo *"
          options={INTERACTION_TYPES}
          value={editInteractionForm.type}
          onChange={e => setEditInteractionForm(f => ({ ...f, type: e.target.value }))}
        />
        <Input
          label="Oggetto *"
          required
          value={editInteractionForm.subject}
          onChange={e => setEditInteractionForm(f => ({ ...f, subject: e.target.value }))}
        />
        {contacts.length > 0 && (
          <Select
            label="Contatto"
            options={[
              { value: '', label: 'Nessun contatto specifico' },
              ...contacts.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.role ? ` - ${c.role}` : ''}` }))
            ]}
            value={editInteractionForm.contactId}
            onChange={e => setEditInteractionForm(f => ({ ...f, contactId: e.target.value }))}
          />
        )}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Contenuto</label>
          <textarea
            rows={4}
            value={editInteractionForm.content}
            onChange={e => setEditInteractionForm(f => ({ ...f, content: e.target.value }))}
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <Input
          label="Data"
          type="datetime-local"
          value={editInteractionForm.date}
          onChange={e => setEditInteractionForm(f => ({ ...f, date: e.target.value }))}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" loading={submitting}>Salva</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ============ DELETE INTERACTION MODAL ============ */
interface DeleteInteractionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  submitting: boolean
}

export function DeleteInteractionModal({ open, onClose, onConfirm, submitting }: DeleteInteractionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Elimina Interazione" size="sm">
      <p className="text-sm text-muted mb-4">Sei sicuro di voler eliminare questa interazione? L&apos;azione non può essere annullata.</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button variant="destructive" onClick={onConfirm} loading={submitting}>Elimina</Button>
      </div>
    </Modal>
  )
}
