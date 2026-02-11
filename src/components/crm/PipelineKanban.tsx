'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'

interface Client {
  id: string
  companyName: string
  status: string
  industry: string | null
  totalRevenue: string
}

const COLUMNS = [
  { status: 'LEAD', label: 'Lead', variant: 'default' as const },
  { status: 'PROSPECT', label: 'Prospect', variant: 'warning' as const },
  { status: 'ACTIVE', label: 'Attivo', variant: 'success' as const },
  { status: 'INACTIVE', label: 'Inattivo', variant: 'outline' as const },
  { status: 'CHURNED', label: 'Perso', variant: 'destructive' as const },
]

function SortableClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: client.id,
    data: { type: 'client', client },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-card rounded-md border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <Avatar name={client.companyName} size="sm" />
        <span className="font-medium text-sm truncate">{client.companyName}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{client.industry || 'N/D'}</span>
        <span className="font-medium">{formatCurrency(client.totalRevenue)}</span>
      </div>
    </div>
  )
}

function ClientCardOverlay({ client }: { client: Client }) {
  return (
    <div className="bg-card rounded-md border-2 border-primary p-3 shadow-lg w-72">
      <div className="flex items-center gap-2 mb-2">
        <Avatar name={client.companyName} size="sm" />
        <span className="font-medium text-sm truncate">{client.companyName}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{client.industry || 'N/D'}</span>
        <span className="font-medium">{formatCurrency(client.totalRevenue)}</span>
      </div>
    </div>
  )
}

interface PipelineKanbanProps {
  clientsByStatus: Record<string, Client[]>
  onStatusChange: (clientId: string, newStatus: string) => void
}

export function PipelineKanban({ clientsByStatus, onStatusChange }: PipelineKanbanProps) {
  const router = useRouter()
  const [activeClient, setActiveClient] = useState<Client | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const client = event.active.data.current?.client as Client | undefined
    if (client) setActiveClient(client)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveClient(null)
    const { active, over } = event
    if (!over) return

    const clientId = active.id as string
    const overData = over.data.current

    // Determine target column
    let targetStatus: string | null = null
    if (overData?.type === 'column') {
      targetStatus = overData.status as string
    } else if (overData?.type === 'client') {
      targetStatus = (overData.client as Client).status
    }

    if (!targetStatus) return

    // Find current status
    const currentClient = active.data.current?.client as Client | undefined
    if (!currentClient || currentClient.status === targetStatus) return

    onStatusChange(clientId, targetStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const clients = clientsByStatus[col.status] || []
          return (
            <DroppableColumn key={col.status} status={col.status}>
              <div className="flex items-center justify-between mb-3">
                <Badge variant={col.variant}>{col.label}</Badge>
                <span className="text-xs text-muted font-medium bg-secondary rounded-full px-2 py-0.5">
                  {clients.length}
                </span>
              </div>

              <SortableContext
                items={clients.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 min-h-[60px]">
                  {clients.map((client) => (
                    <SortableClientCard
                      key={client.id}
                      client={client}
                      onClick={() => router.push(`/crm/${client.id}`)}
                    />
                  ))}
                  {clients.length === 0 && (
                    <p className="text-xs text-muted text-center py-4">Nessun cliente</p>
                  )}
                </div>
              </SortableContext>
            </DroppableColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeClient && <ClientCardOverlay client={activeClient} />}
      </DragOverlay>
    </DndContext>
  )
}

function DroppableColumn({ status, children }: { status: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useSortable({
    id: `column-${status}`,
    data: { type: 'column', status },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-lg p-3 transition-colors ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-secondary/30'
      }`}
    >
      {children}
    </div>
  )
}
