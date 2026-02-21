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
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'
import { Calendar, Percent } from 'lucide-react'
import { EditDealModal } from '@/components/crm/EditDealModal'

interface Deal {
  id: string
  title: string
  description: string | null
  value: string
  stage: string
  probability: number
  expectedCloseDate: string | null
  actualCloseDate: string | null
  lostReason: string | null
  clientId: string | null
  leadId: string | null
  client: { id: string; companyName: string } | null
  lead: { id: string; name: string; company: string | null } | null
  contact: { id: string; firstName: string; lastName: string } | null
  owner: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  createdAt: string
  updatedAt: string
}

const COLUMNS = [
  { stage: 'QUALIFICATION', label: 'Qualificazione', borderColor: 'border-t-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600' },
  { stage: 'PROPOSAL', label: 'Proposta', borderColor: 'border-t-amber-500', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600' },
  { stage: 'NEGOTIATION', label: 'Negoziazione', borderColor: 'border-t-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600' },
  { stage: 'CLOSED_WON', label: 'Chiusa - Vinta', borderColor: 'border-t-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-600' },
  { stage: 'CLOSED_LOST', label: 'Chiusa - Persa', borderColor: 'border-t-red-500', bgColor: 'bg-red-500/10', textColor: 'text-red-600' },
]

function getStageBorderColor(stage: string): string {
  const col = COLUMNS.find((c) => c.stage === stage)
  return col?.borderColor || 'border-t-gray-400'
}

const SortableDealCard = memo(function SortableDealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', deal },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`rounded-lg border border-border/40 border-t-4 ${getStageBorderColor(deal.stage)} bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all`}
    >
      <h3 className="font-medium text-sm truncate mb-2">{deal.title}</h3>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted truncate flex-1">{deal.client?.companyName || deal.lead?.name || deal.lead?.company || '—'}</span>
        <span className="text-sm font-bold ml-2 flex-shrink-0">{formatCurrency(deal.value)}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Avatar
          name={`${deal.owner.firstName} ${deal.owner.lastName}`}
          size="xs"
          src={deal.owner.avatarUrl || undefined}
        />
        <span className="text-xs text-muted truncate">{deal.owner.firstName} {deal.owner.lastName}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Percent className="h-3 w-3 text-muted" />
          <span className="text-muted">{deal.probability}%</span>
        </div>
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-1 text-muted">
            <Calendar className="h-3 w-3" />
            <span>{new Date(deal.expectedCloseDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
          </div>
        )}
      </div>
    </div>
  )
})

function DealCardOverlay({ deal }: { deal: Deal }) {
  return (
    <div className="bg-card rounded-lg border-2 border-primary p-3 shadow-lg w-72">
      <h3 className="font-medium text-sm truncate mb-2">{deal.title}</h3>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted truncate">{deal.client?.companyName || deal.lead?.name || deal.lead?.company || '—'}</span>
        <span className="text-sm font-bold">{formatCurrency(deal.value)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Avatar
          name={`${deal.owner.firstName} ${deal.owner.lastName}`}
          size="xs"
          src={deal.owner.avatarUrl || undefined}
        />
        <span className="text-xs text-muted">{deal.owner.firstName} {deal.owner.lastName}</span>
      </div>
    </div>
  )
}

interface DealsKanbanProps {
  dealsByStage: Record<string, Deal[]>
  onStageChange: (dealId: string, newStage: string) => void
  onRefresh?: () => void
}

export function DealsKanban({ dealsByStage, onStageChange, onRefresh }: DealsKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const deal = event.active.data.current?.deal as Deal | undefined
    if (deal) setActiveDeal(deal)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return

    const dealId = active.id as string
    const overData = over.data.current

    // Determine target column
    let targetStage: string | null = null
    if (overData?.type === 'column') {
      targetStage = overData.stage as string
    } else if (overData?.type === 'deal') {
      targetStage = (overData.deal as Deal).stage
    }

    if (!targetStage) return

    // Find current stage
    const currentDeal = active.data.current?.deal as Deal | undefined
    if (!currentDeal || currentDeal.stage === targetStage) return

    onStageChange(dealId, targetStage)
  }

  function handleDealClick(deal: Deal) {
    // Don't open edit modal if dragging
    if (activeDeal) return
    setEditingDeal(deal)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
          {COLUMNS.map((col) => {
            const deals = dealsByStage[col.stage] || []
            const stageValue = deals.reduce((sum, d) => sum + parseFloat(d.value || '0'), 0)

            return (
              <DroppableColumn key={col.stage} stage={col.stage}>
                <div className={`flex items-center justify-between mb-3 px-3 py-2.5 rounded-lg ${col.bgColor}`}>
                  <div>
                    <span className={`text-sm font-bold ${col.textColor} block`}>{col.label}</span>
                    <span className={`text-xs font-medium ${col.textColor} opacity-80`}>
                      {formatCurrency(stageValue)}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${col.textColor} bg-white/60 dark:bg-white/10 rounded-full px-2 py-0.5`}>
                    {deals.length}
                  </span>
                </div>

                <SortableContext
                  items={deals.map((d) => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2.5 min-h-[200px]">
                    {deals.map((deal) => (
                      <SortableDealCard
                        key={deal.id}
                        deal={deal}
                        onClick={() => handleDealClick(deal)}
                      />
                    ))}
                    {deals.length === 0 && (
                      <p className="text-xs text-muted text-center py-4">Nessuna opportunità</p>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            )
          })}
        </div>

        <DragOverlay>
          {activeDeal && <DealCardOverlay deal={activeDeal} />}
        </DragOverlay>
      </DndContext>

      {editingDeal && (
        <EditDealModal
          deal={editingDeal}
          open={!!editingDeal}
          onOpenChange={(open) => !open && setEditingDeal(null)}
          onSuccess={() => {
            setEditingDeal(null)
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}

function DroppableColumn({ stage, children }: { stage: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage}`,
    data: { type: 'column', stage },
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
