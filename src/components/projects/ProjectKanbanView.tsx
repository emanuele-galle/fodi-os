'use client'

import { Badge } from '@/components/ui/Badge'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { type Project, PRIORITY_LABELS, STATUS_COLORS, KANBAN_COLUMNS } from './types'

const kanbanCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  const columnHit = pointerCollisions.find((c) => String(c.id).startsWith('column-'))
  if (columnHit) return [columnHit]
  if (pointerCollisions.length > 0) return pointerCollisions
  const rectCollisions = rectIntersection(args)
  const rectColumnHit = rectCollisions.find((c) => String(c.id).startsWith('column-'))
  if (rectColumnHit) return [rectColumnHit]
  return rectCollisions
}

function DroppableColumn({ columnKey, children }: { columnKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnKey}`,
    data: { type: 'column', columnKey },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[75vw] md:w-64 snap-center md:snap-align-none rounded-lg p-3 transition-colors min-h-[200px] ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-secondary/30'
      }`}
    >
      {children}
    </div>
  )
}

function KanbanProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const totalTasks = project._count?.tasks ?? 0
  const doneTasks = project.completedTasks ?? 0

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-md border border-border p-3 cursor-pointer hover:shadow-sm transition-shadow"
      style={{ borderLeft: `3px solid ${project.color || STATUS_COLORS[project.status] || 'var(--color-primary)'}` }}
    >
      <p className="font-medium text-sm mb-1.5 truncate">{project.name}</p>
      {project.client && (
        <p className="text-[11px] text-muted mb-2">{project.client.companyName}</p>
      )}
      <div className="flex items-center justify-between">
        <Badge status={project.priority} className="text-[10px]">
          {PRIORITY_LABELS[project.priority] || project.priority}
        </Badge>
        <span className="text-[10px] text-muted">
          {totalTasks > 0 ? `${doneTasks}/${totalTasks}` : '0 task'}
        </span>
      </div>
      {project.endDate && (
        <p className="text-[10px] text-muted mt-1.5">
          Scadenza: {new Date(project.endDate).toLocaleDateString('it-IT')}
        </p>
      )}
    </div>
  )
}

function KanbanOverlayCard({ project }: { project: Project }) {
  return (
    <div className="bg-card rounded-md border-2 border-primary p-3 shadow-lg w-60">
      <p className="font-medium text-sm mb-1">{project.name}</p>
      <Badge status={project.priority} className="text-[10px]">
        {PRIORITY_LABELS[project.priority] || project.priority}
      </Badge>
    </div>
  )
}

interface ProjectKanbanViewProps {
  kanbanProjects: Record<string, Project[]>
  activeProject: Project | null
  allProjects: Project[]
  setActiveProject: (project: Project | null) => void
  setAllProjects: React.Dispatch<React.SetStateAction<Project[]>>
  fetchProjects: () => void
  onProjectClick: (projectId: string) => void
}

export function ProjectKanbanView({
  kanbanProjects,
  activeProject,
  allProjects,
  setActiveProject,
  setAllProjects,
  fetchProjects,
  onProjectClick,
}: ProjectKanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const project = allProjects.find((p) => p.id === id)
    if (project) setActiveProject(project)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveProject(null)
    const { active, over } = event
    if (!over) return

    const projectId = active.id as string
    const overId = String(over.id)
    let targetStatus: string | null = null

    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '')
    }
    if (!targetStatus) return

    const project = allProjects.find((p) => p.id === projectId)
    if (!project || project.status === targetStatus) return

    // Optimistic update
    setAllProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: targetStatus! } : p))
    )

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      if (!res.ok) {
        setAllProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: project.status } : p))
        )
      } else {
        fetchProjects()
      }
    } catch {
      setAllProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: project.status } : p))
      )
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
        {KANBAN_COLUMNS.map((col) => {
          const colProjects = kanbanProjects[col.key] || []
          return (
            <DroppableColumn key={col.key} columnKey={col.key}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm">{col.label}</span>
                <span className="text-xs text-muted bg-secondary rounded-full px-2 py-0.5">
                  {colProjects.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {colProjects.map((project) => (
                  <KanbanProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => onProjectClick(project.id)}
                  />
                ))}
              </div>
            </DroppableColumn>
          )
        })}
      </div>
      <DragOverlay>
        {activeProject && <KanbanOverlayCard project={activeProject} />}
      </DragOverlay>
    </DndContext>
  )
}
