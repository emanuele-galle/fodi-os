import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

interface StageTaskTemplate {
  title: string
  description: string
  daysUntilDue: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  taskType: string
}

/**
 * Maps stage transitions to automatic tasks.
 * Key format: "FROM_STAGE→TO_STAGE"
 */
const STAGE_TRANSITION_TASKS: Record<string, StageTaskTemplate[]> = {
  'QUALIFICATION→PROPOSAL': [
    {
      title: 'Preparare preventivo',
      description: 'Elaborare il preventivo dettagliato per il cliente',
      daysUntilDue: 3,
      priority: 'HIGH',
      taskType: 'CRM',
    },
    {
      title: 'Raccogliere requisiti dettagliati',
      description: 'Documentare tutti i requisiti specifici del cliente per la proposta',
      daysUntilDue: 2,
      priority: 'MEDIUM',
      taskType: 'CRM',
    },
  ],
  'PROPOSAL→NEGOTIATION': [
    {
      title: 'Follow-up proposta inviata',
      description: 'Contattare il cliente per discutere la proposta e raccogliere feedback',
      daysUntilDue: 2,
      priority: 'HIGH',
      taskType: 'CRM',
    },
    {
      title: 'Preparare documentazione contrattuale',
      description: 'Predisporre contratto e condizioni commerciali',
      daysUntilDue: 5,
      priority: 'MEDIUM',
      taskType: 'CRM',
    },
  ],
  'NEGOTIATION→CLOSED_WON': [
    {
      title: 'Onboarding cliente',
      description: 'Avviare il processo di onboarding e kick-off del progetto',
      daysUntilDue: 3,
      priority: 'HIGH',
      taskType: 'CRM',
    },
    {
      title: 'Emettere fattura',
      description: 'Creare e inviare la fattura al cliente',
      daysUntilDue: 1,
      priority: 'URGENT',
      taskType: 'CRM',
    },
  ],
  'NEGOTIATION→CLOSED_LOST': [
    {
      title: 'Analisi motivo perdita',
      description: 'Documentare le ragioni della perdita per migliorare le future proposte',
      daysUntilDue: 5,
      priority: 'LOW',
      taskType: 'CRM',
    },
  ],
}

interface CreateStageTasksParams {
  dealId: string
  dealTitle: string
  oldStage: string
  newStage: string
  ownerId: string
  clientId: string | null
}

/**
 * Creates automatic tasks when a deal changes stage.
 * Fire-and-forget: errors are logged but never block the main operation.
 */
export async function createStageTransitionTasks(params: CreateStageTasksParams): Promise<void> {
  const { dealId, dealTitle, oldStage, newStage, ownerId, clientId } = params
  const key = `${oldStage}→${newStage}`
  const templates = STAGE_TRANSITION_TASKS[key]

  if (!templates || templates.length === 0) return

  const now = new Date()

  const tasks = await prisma.$transaction(
    templates.map((tpl) => {
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + tpl.daysUntilDue)

      return prisma.task.create({
        data: {
          title: `${tpl.title} — ${dealTitle}`,
          description: tpl.description,
          priority: tpl.priority,
          taskType: tpl.taskType,
          assigneeId: ownerId,
          creatorId: ownerId,
          clientId,
          dueDate,
          tags: ['auto-crm', `deal:${dealId}`],
          isPersonal: false,
        },
      })
    })
  )

  // Create assignments for each task
  if (tasks.length > 0) {
    await prisma.taskAssignment.createMany({
      data: tasks.map((t) => ({
        taskId: t.id,
        userId: ownerId,
        role: 'assignee',
        assignedBy: ownerId,
      })),
      skipDuplicates: true,
    })
  }

  logActivity({
    userId: ownerId,
    action: 'AUTO_CREATE',
    entityType: 'TASK',
    entityId: dealId,
    metadata: {
      trigger: 'deal_stage_change',
      from: oldStage,
      to: newStage,
      tasksCreated: tasks.length,
      taskIds: tasks.map((t) => t.id),
    },
  })
}
