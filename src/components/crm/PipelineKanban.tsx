'use client'

import { useState, memo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
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
  { status: 'LEAD', label: 'Lead', variant: 'default' as const, headerBg: 'bg-blue-500/10', headerText: 'text-blue-600', borderColor: 'border-l-blue-500' },
  { status: 'PROSPECT', label: 'Prospect', variant: 'warning' as const, headerBg: 'bg-amber-500/10', headerText: 'text-amber-600', borderColor: 'border-l-amber-500' },
  { status: 'ACTIVE', label: 'Attivo', variant: 'success' as const, headerBg: 'bg-emerald-500/10', headerText: 'text-emerald-600', borderColor: 'border-l-emerald-500' },
  { status: 'INACTIVE', label: 'Inattivo', variant: 'outline' as const, headerBg: 'bg-gray-500/10', headerText: 'text-gray-500', borderColor: 'border-l-gray-400' },
  { status: 'CHURNED', label: 'Perso', variant: 'destructive' as const, headerBg: 'bg-red-500/10', headerText: 'text-red-500', borderColor: 'border-l-red-500' },
]

function getStatusBorderColor(status: string): string {
  const col = COLUMNS.find((c) => c.status === status)
  return col?.borderColor || 'border-l-gray-400'
}

const SortableClientCard = memo(function SortableClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
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
      className={`bg-card rounded-lg border border-border/60 border-l-4 ${getStatusBorderColor(client.status)} p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-all`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <Avatar name={client.companyName} size="sm" />
        <span className="font-semibold text-sm truncate">{client.companyName}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{client.industry || 'N/D'}</span>
        <span className="font-semibold text-foreground">{formatCurrency(client.totalRevenue)}</span>
      </div>
    </div>
  )
})

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
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
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
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
        {COLUMNS.map((col) => {
          const clients = clientsByStatus[col.status] || []
          return (
            <DroppableColumn key={col.status} status={col.status}>
              <div className={`flex items-center justify-between mb-3 px-3 py-2.5 rounded-lg ${col.headerBg}`}>
                <span className={`text-sm font-bold ${col.headerText}`}>{col.label}</span>
                <span className={`text-xs font-semibold ${col.headerText} bg-white/60 dark:bg-white/10 rounded-full px-2 py-0.5`}>
                  {clients.length}
                </span>
              </div>

              <SortableContext
                items={clients.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5 min-h-[200px]">
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
      className={`flex-shrink-0 w-[75vw] md:w-72 snap-center md:snap-align-none rounded-xl p-3 transition-all ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/20 shadow-lg' : 'bg-secondary/20 border border-border/30'
      }`}
    >
      {children}
    </div>
  )
}
