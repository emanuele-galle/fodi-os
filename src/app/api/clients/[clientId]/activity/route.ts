import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string }> }

interface ActivityItem {
  id: string
  type: 'interaction' | 'activity' | 'task' | 'deal' | 'document'
  title: string
  description?: string
  date: string
  icon: string
  metadata?: Record<string, unknown>
  user?: { firstName: string; lastName: string }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '30', 10)

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    // Fetch all activity types in parallel
    const [interactions, activityLogs, tasks, deals, documents] = await Promise.all([
      // 1. Interactions
      prisma.interaction.findMany({
        where: { clientId },
        select: {
          id: true,
          type: true,
          subject: true,
          content: true,
          date: true,
          contact: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // 2. Activity logs
      prisma.activityLog.findMany({
        where: {
          entityType: 'CLIENT',
          entityId: clientId,
        },
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // 3. Completed tasks
      prisma.task.findMany({
        where: {
          clientId,
          status: 'DONE',
        },
        select: {
          id: true,
          title: true,
          completedAt: true,
          assignee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // 4. Deals
      prisma.deal.findMany({
        where: { clientId },
        select: {
          id: true,
          title: true,
          stage: true,
          value: true,
          updatedAt: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // 5. Documents
      prisma.document.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          category: true,
          createdAt: true,
        },
      }),
    ])

    // Normalize all items to unified format
    const items: ActivityItem[] = []

    // Process interactions
    interactions.forEach((interaction) => {
      items.push({
        id: interaction.id,
        type: 'interaction',
        title: `${interaction.type === 'CALL' ? 'Chiamata' : interaction.type === 'EMAIL' ? 'Email' : interaction.type === 'MEETING' ? 'Incontro' : 'Nota'}: ${interaction.subject}`,
        description: interaction.content || undefined,
        date: interaction.date.toISOString(),
        icon: interaction.type.toLowerCase(),
        metadata: {
          interactionType: interaction.type,
          subject: interaction.subject,
        },
        user: interaction.contact
          ? {
              firstName: interaction.contact.firstName,
              lastName: interaction.contact.lastName,
            }
          : undefined,
      })
    })

    // Process activity logs
    activityLogs.forEach((log) => {
      const actionLabels: Record<string, string> = {
        CREATE: 'creato',
        UPDATE: 'modificato',
        DELETE: 'eliminato',
        ARCHIVE: 'archiviato',
        RESTORE: 'ripristinato',
      }

      items.push({
        id: log.id,
        type: 'activity',
        title: `Cliente ${actionLabels[log.action] || log.action.toLowerCase()}`,
        description: log.metadata ? JSON.stringify(log.metadata) : undefined,
        date: log.createdAt.toISOString(),
        icon: 'activity',
        metadata: {
          action: log.action,
          ...((log.metadata as object) || {}),
        },
        user: log.user
          ? {
              firstName: log.user.firstName,
              lastName: log.user.lastName,
            }
          : undefined,
      })
    })

    // Process completed tasks
    tasks.forEach((task) => {
      items.push({
        id: task.id,
        type: 'task',
        title: `Task completato: ${task.title}`,
        date: task.completedAt?.toISOString() || new Date().toISOString(),
        icon: 'check-circle',
        metadata: {
          taskTitle: task.title,
        },
        user: task.assignee
          ? {
              firstName: task.assignee.firstName,
              lastName: task.assignee.lastName,
            }
          : undefined,
      })
    })

    // Process deals (each deal = stage change event)
    deals.forEach((deal) => {
      const stageLabels: Record<string, string> = {
        LEAD: 'Lead',
        QUALIFIED: 'Qualificato',
        PROPOSAL: 'Proposta',
        NEGOTIATION: 'Negoziazione',
        WON: 'Vinto',
        LOST: 'Perso',
      }

      items.push({
        id: deal.id,
        type: 'deal',
        title: `Deal: ${deal.title}`,
        description: `Fase: ${stageLabels[deal.stage] || deal.stage} - Valore: €${parseFloat(deal.value.toString()).toLocaleString('it-IT')}`,
        date: deal.updatedAt.toISOString(),
        icon: 'trending-up',
        metadata: {
          dealTitle: deal.title,
          stage: deal.stage,
          value: deal.value,
        },
        user: deal.owner
          ? {
              firstName: deal.owner.firstName,
              lastName: deal.owner.lastName,
            }
          : undefined,
      })
    })

    // Process documents
    documents.forEach((doc) => {
      const categoryLabels: Record<string, string> = {
        CONTRACT: 'Contratto',
        INVOICE: 'Fattura',
        QUOTE: 'Preventivo',
        OTHER: 'Altro',
      }

      items.push({
        id: doc.id,
        type: 'document',
        title: `Documento caricato: ${doc.name}`,
        description: categoryLabels[doc.category] || doc.category,
        date: doc.createdAt.toISOString(),
        icon: 'file-text',
        metadata: {
          fileName: doc.name,
          category: doc.category,
        },
      })
    })

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Pagination
    const total = items.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = items.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      items: paginatedItems,
      total,
      page,
      limit,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[activity/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
