'use client'

import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Edit, Trash2, MessageSquare, CheckSquare,
  TrendingUp, FileText, Paperclip, FolderKanban, Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/crm-constants'

import { useClientDetail } from '@/components/crm/useClientDetail'
import { ClientOverviewTab } from '@/components/crm/ClientOverviewTab'
import { ClientContactsTab } from '@/components/crm/ClientContactsTab'
import { ClientInteractionsTab } from '@/components/crm/ClientInteractionsTab'
import { ClientProjectsTab } from '@/components/crm/ClientProjectsTab'
import { ClientQuotesTab } from '@/components/crm/ClientQuotesTab'
import { ClientTasksTab } from '@/components/crm/ClientTasksTab'
import { ClientDealsTab } from '@/components/crm/ClientDealsTab'
import { ClientDocumentsTab } from '@/components/crm/ClientDocumentsTab'
import { ClientTimelineTab } from '@/components/crm/ClientTimelineTab'
import { ClientFinancesTab } from '@/components/crm/ClientFinancesTab'
import { ClientExpensesTab } from '@/components/crm/ClientExpensesTab'
import { ClientSignaturesTab } from '@/components/crm/ClientSignaturesTab'
import {
  AddContactModal, AddInteractionModal, EditClientModal, DeleteClientModal,
  EditContactModal, DeleteContactModal, EditInteractionModal, DeleteInteractionModal
} from '@/components/crm/ClientModals'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const {
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
  } = useClientDetail(clientId)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Cliente non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/crm')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => router.push('/crm')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna alla lista clienti
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={client.companyName} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold truncate">{client.companyName}</h1>
            <Badge status={client.status}>
              {STATUS_LABELS[client.status] || client.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="min-h-[44px] sm:min-h-0">
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Modifica</span>
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 min-h-[44px] sm:min-h-0" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
        <div className="bg-card border border-border/40 rounded-lg p-2.5 md:p-3">
          <p className="text-[10px] md:text-xs text-muted mb-0.5">Revenue Totale</p>
          <p className="text-base md:text-lg font-bold text-emerald-500 tabular-nums">{formatCurrency(client.totalRevenue)}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-2.5 md:p-3">
          <p className="text-[10px] md:text-xs text-muted mb-0.5">Contatti</p>
          <p className="text-base md:text-lg font-bold">{client.contacts.length}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-2.5 md:p-3">
          <p className="text-[10px] md:text-xs text-muted mb-0.5">Interazioni</p>
          <p className="text-base md:text-lg font-bold">{client.interactions.length}</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Panoramica', content: (
            <div className="space-y-6">
              <ClientOverviewTab client={client} />
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-emerald-500" />Finanze & Spese</h3>
                <ClientFinancesTab clientId={clientId} quotes={client.quotes} />
                <div className="mt-4">
                  <ClientExpensesTab clientId={clientId} />
                </div>
              </div>
            </div>
          )},
          { id: 'contacts', label: 'Contatti', content: (
            <ClientContactsTab
              contacts={client.contacts}
              onAddContact={() => setContactModalOpen(true)}
              onEditContact={openEditContact}
              onDeleteContact={(id) => setDeleteContactId(id)}
            />
          )},
          { id: 'activity', label: 'Attività', content: (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-500" />Interazioni</h3>
                <ClientInteractionsTab
                  interactions={client.interactions}
                  onAddInteraction={() => setInteractionModalOpen(true)}
                  onEditInteraction={openEditInteraction}
                  onDeleteInteraction={(id) => setDeleteInteractionId(id)}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckSquare className="h-4 w-4 text-violet-500" />Task CRM</h3>
                <ClientTasksTab clientId={clientId} />
              </div>
            </div>
          )},
          { id: 'commercial', label: 'Commerciale', content: (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-500" />Opportunità</h3>
                <ClientDealsTab clientId={clientId} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-amber-500" />Preventivi</h3>
                <ClientQuotesTab quotes={client.quotes} clientId={clientId} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Paperclip className="h-4 w-4 text-cyan-500" />Firme</h3>
                <ClientSignaturesTab clientId={clientId} />
              </div>
              {client.projects.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FolderKanban className="h-4 w-4 text-emerald-500" />Progetti</h3>
                  <ClientProjectsTab projects={client.projects} />
                </div>
              )}
            </div>
          )},
          { id: 'documents', label: 'Documenti', content: <ClientDocumentsTab clientId={clientId} /> },
          { id: 'timeline', label: 'Cronologia', content: <ClientTimelineTab clientId={clientId} /> },
        ]}
      />

      <AddContactModal open={contactModalOpen} onClose={() => setContactModalOpen(false)} onSubmit={handleAddContact} submitting={submitting} />
      <AddInteractionModal open={interactionModalOpen} onClose={() => setInteractionModalOpen(false)} onSubmit={handleAddInteraction} submitting={submitting} contacts={client.contacts} />
      <EditClientModal open={editModalOpen} onClose={() => setEditModalOpen(false)} onSubmit={handleEditClient} submitting={submitting} editForm={editForm} setEditForm={setEditForm} />
      <DeleteClientModal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDeleteClient} submitting={submitting} companyName={client.companyName} />
      <EditContactModal open={!!editContactId} onClose={() => setEditContactId(null)} onSubmit={handleEditContact} submitting={submitting} editContactForm={editContactForm} setEditContactForm={setEditContactForm} />
      <DeleteContactModal open={!!deleteContactId} onClose={() => setDeleteContactId(null)} onConfirm={handleDeleteContact} submitting={submitting} />
      <EditInteractionModal open={!!editInteractionId} onClose={() => setEditInteractionId(null)} onSubmit={handleEditInteraction} submitting={submitting} editInteractionForm={editInteractionForm} setEditInteractionForm={setEditInteractionForm} contacts={client.contacts} />
      <DeleteInteractionModal open={!!deleteInteractionId} onClose={() => setDeleteInteractionId(null)} onConfirm={handleDeleteInteraction} submitting={submitting} />
    </div>
  )
}
