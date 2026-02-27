'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientDetail, Contact, Interaction } from './types'

export function useClientDetail(clientId: string) {
  const router = useRouter()

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [interactionModalOpen, setInteractionModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editContactId, setEditContactId] = useState<string | null>(null)
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const [editInteractionId, setEditInteractionId] = useState<string | null>(null)
  const [deleteInteractionId, setDeleteInteractionId] = useState<string | null>(null)

  const [editForm, setEditForm] = useState({
    companyName: '', vatNumber: '', fiscalCode: '', pec: '', sdi: '',
    website: '', industry: '', source: '', status: '', notes: '', tags: ''
  })

  const [editContactForm, setEditContactForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: '', isPrimary: false, notes: ''
  })

  const [editInteractionForm, setEditInteractionForm] = useState({
    type: '', subject: '', content: '', contactId: '', date: ''
  })

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data)
        setEditForm({
          companyName: data.companyName || '',
          vatNumber: data.vatNumber || '',
          fiscalCode: data.fiscalCode || '',
          pec: data.pec || '',
          sdi: data.sdi || '',
          website: data.website || '',
          industry: data.industry || '',
          source: data.source || '',
          status: data.status || '',
          notes: data.notes || '',
          tags: (data.tags || []).join(', ')
        })
      }
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  async function handleAddContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = { clientId }
    form.forEach((v, k) => {
      if (k === 'isPrimary') { body[k] = v === 'on' }
      else if (typeof v === 'string' && v.trim()) { body[k] = v.trim() }
    })
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setContactModalOpen(false); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleAddInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = { clientId }
    form.forEach((v, k) => { if (typeof v === 'string' && v.trim()) body[k] = v.trim() })
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setInteractionModalOpen(false); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleEditClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editForm)) {
      if (k === 'tags') { body.tags = (v as string).split(',').map(t => t.trim()).filter(Boolean) }
      else if (typeof v === 'string') { body[k] = v.trim() || null }
    }
    if (editForm.companyName.trim()) body.companyName = editForm.companyName.trim()
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setEditModalOpen(false); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleDeleteClient() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (res.ok) router.push('/crm')
    } finally { setSubmitting(false) }
  }

  function openEditContact(contact: Contact) {
    setEditContactId(contact.id)
    setEditContactForm({
      firstName: contact.firstName, lastName: contact.lastName,
      email: contact.email || '', phone: contact.phone || '',
      role: contact.role || '', isPrimary: contact.isPrimary,
      notes: (contact as Contact & { notes?: string | null }).notes || ''
    })
  }

  function openEditInteraction(interaction: Interaction) {
    setEditInteractionId(interaction.id)
    setEditInteractionForm({
      type: interaction.type, subject: interaction.subject,
      content: interaction.content || '', contactId: interaction.contactId || '',
      date: interaction.date ? new Date(interaction.date).toISOString().slice(0, 16) : '',
    })
  }

  async function handleEditInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editInteractionId) return
    setSubmitting(true)
    const body: Record<string, unknown> = {}
    if (editInteractionForm.type) body.type = editInteractionForm.type
    if (editInteractionForm.subject.trim()) body.subject = editInteractionForm.subject.trim()
    body.content = editInteractionForm.content.trim() || null
    body.contactId = editInteractionForm.contactId || null
    if (editInteractionForm.date) body.date = new Date(editInteractionForm.date).toISOString()
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions/${editInteractionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setEditInteractionId(null); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleDeleteInteraction() {
    if (!deleteInteractionId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions/${deleteInteractionId}`, { method: 'DELETE' })
      if (res.ok) { setDeleteInteractionId(null); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleEditContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editContactId) return
    setSubmitting(true)
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editContactForm)) {
      if (k === 'isPrimary') body[k] = v
      else if (k === 'notes') body[k] = (v as string).trim() || null
      else if (typeof v === 'string') body[k] = v.trim() || null
    }
    if (editContactForm.firstName.trim()) body.firstName = editContactForm.firstName.trim()
    if (editContactForm.lastName.trim()) body.lastName = editContactForm.lastName.trim()
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts/${editContactId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setEditContactId(null); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleDeleteContact() {
    if (!deleteContactId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts/${deleteContactId}`, { method: 'DELETE' })
      if (res.ok) { setDeleteContactId(null); fetchClient() }
    } finally { setSubmitting(false) }
  }

  return {
    client, loading, submitting,
    contactModalOpen, setContactModalOpen,
    interactionModalOpen, setInteractionModalOpen,
    editModalOpen, setEditModalOpen,
    deleteConfirmOpen, setDeleteConfirmOpen,
    editContactId, setEditContactId,
    deleteContactId, setDeleteContactId,
    editInteractionId, setEditInteractionId,
    deleteInteractionId, setDeleteInteractionId,
    editForm, setEditForm,
    editContactForm, setEditContactForm,
    editInteractionForm, setEditInteractionForm,
    handleAddContact, handleAddInteraction,
    handleEditClient, handleDeleteClient,
    openEditContact, openEditInteraction,
    handleEditInteraction, handleDeleteInteraction,
    handleEditContact, handleDeleteContact,
  }
}
