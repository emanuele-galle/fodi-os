import { prisma } from '@/lib/prisma'
import { sendViaSMTP } from '@/lib/email'
import { brand } from '@/lib/branding'
import { dispatchNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import type { Prisma } from '@/generated/prisma/client'

// ============================================================
// TYPES
// ============================================================

interface TriggerConfig {
  daysInactive?: number
  monthsBeforeAnniversary?: number
}

interface ActionConfig {
  templateSlug?: string
  subject?: string
  message?: string
  taskTitle?: string
  taskPriority?: string
}

// ============================================================
// PROCESS ALL ACTIVE RULES
// ============================================================

export async function processTouchpointRules(): Promise<{ processed: number; actions: number; errors: number }> {
  const brandSlug = brand.slug
  const rules = await prisma.touchpointRule.findMany({
    where: { brandSlug, isActive: true },
  })

  let processed = 0
  let actions = 0
  let errors = 0

  for (const rule of rules) {
    try {
      const triggerConfig = rule.triggerConfig as TriggerConfig
      const actionConfig = rule.actionConfig as ActionConfig
      const count = await processRule(rule.triggerType, triggerConfig, rule.actionType, actionConfig, rule.name, brandSlug)
      actions += count
      processed++
    } catch {
      errors++
    }
  }

  return { processed, actions, errors }
}

// ============================================================
// RULE PROCESSOR
// ============================================================

const PRIMARY_CONTACT_SELECT = {
  where: { isPrimary: true } as const,
  select: { email: true, firstName: true } as const,
  take: 1 as const,
}

const CLIENT_BASE_SELECT = {
  id: true,
  companyName: true,
  contacts: PRIMARY_CONTACT_SELECT,
}

async function processRule(
  triggerType: string,
  triggerConfig: TriggerConfig,
  actionType: string,
  actionConfig: ActionConfig,
  ruleName: string,
  brandSlug: string,
): Promise<number> {
  const handlers: Record<string, () => Promise<number>> = {
    INACTIVITY: () => handleInactivity(triggerConfig, actionType, actionConfig, ruleName, brandSlug),
    ANNIVERSARY: () => handleAnniversary(actionType, actionConfig, ruleName, brandSlug),
    DEAL_WON: () => handleDealWon(actionType, actionConfig, ruleName, brandSlug),
  }
  const handler = handlers[triggerType]
  return handler ? handler() : 0
}

async function handleInactivity(
  triggerConfig: TriggerConfig, actionType: string, actionConfig: ActionConfig, ruleName: string, brandSlug: string,
): Promise<number> {
  const days = triggerConfig.daysInactive || 30
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const clients = await prisma.client.findMany({
    where: { status: 'ACTIVE', interactions: { every: { date: { lt: cutoff } } } },
    select: CLIENT_BASE_SELECT,
    take: 50,
  })

  let count = 0
  for (const client of clients) {
    if (await isDuplicate(`inactivity-${days}d`, client.id)) continue
    await executeAction(actionType, actionConfig, client, ruleName, brandSlug)
    count++
  }
  return count
}

async function handleAnniversary(
  actionType: string, actionConfig: ActionConfig, ruleName: string, brandSlug: string,
): Promise<number> {
  const now = new Date()
  const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const clients = await prisma.client.findMany({
    where: { status: { in: ['ACTIVE', 'PROSPECT'] }, anniversaryDate: { not: null } },
    select: { ...CLIENT_BASE_SELECT, anniversaryDate: true },
  })

  let count = 0
  for (const client of clients) {
    if (!client.anniversaryDate) continue
    const a = client.anniversaryDate
    const key = `${String(a.getMonth() + 1).padStart(2, '0')}-${String(a.getDate()).padStart(2, '0')}`
    if (key !== today) continue
    if (await isDuplicate('anniversary', client.id)) continue
    await executeAction(actionType, actionConfig, client, ruleName, brandSlug)
    count++
  }
  return count
}

async function handleDealWon(
  actionType: string, actionConfig: ActionConfig, ruleName: string, brandSlug: string,
): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const wonDeals = await prisma.deal.findMany({
    where: { stage: 'CLOSED_WON', actualCloseDate: { gte: oneDayAgo }, clientId: { not: null } },
    select: { id: true, clientId: true, client: { select: CLIENT_BASE_SELECT } },
  })

  let count = 0
  for (const deal of wonDeals) {
    if (!deal.client) continue
    if (await isDuplicate(`deal-won-${deal.id}`, deal.client.id)) continue
    await executeAction(actionType, actionConfig, deal.client, ruleName, brandSlug)
    count++
  }
  return count
}

// ============================================================
// ACTION EXECUTOR
// ============================================================

interface ClientForAction {
  id: string
  companyName: string
  contacts: { email: string | null; firstName: string }[]
}

async function executeAction(
  actionType: string,
  actionConfig: ActionConfig,
  client: ClientForAction,
  ruleName: string,
  brandSlug: string,
) {
  const contact = client.contacts[0]

  switch (actionType) {
    case 'EMAIL': {
      if (!contact?.email) break
      const subject = (actionConfig.subject || ruleName).replace('{companyName}', client.companyName)
      const template = actionConfig.templateSlug
        ? await prisma.emailTemplate.findUnique({ where: { slug: actionConfig.templateSlug } })
        : null
      const body = template
        ? template.bodyHtml
            .replace(/{firstName}/g, contact.firstName || '')
            .replace(/{companyName}/g, client.companyName)
            .replace(/{brandName}/g, brand.name)
        : `<p>Ciao ${contact.firstName || ''},</p><p>${actionConfig.message || ''}</p><p>Cordiali saluti,<br>${brand.name}</p>`

      const sent = await sendViaSMTP(contact.email, subject, body)
      await prisma.campaignSend.create({
        data: {
          campaignName: ruleName,
          clientId: client.id,
          contactEmail: contact.email,
          subject,
          status: sent ? 'SENT' : 'FAILED',
          sentAt: sent ? new Date() : null,
        },
      })
      break
    }

    case 'NOTIFICATION': {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })
      await dispatchNotification({
        type: 'touchpoint',
        title: ruleName,
        message: actionConfig.message || `Touchpoint per ${client.companyName}`,
        link: `/crm/${client.id}`,
        recipientIds: admins.map((a) => a.id),
        excludeUserId: null,
      })
      break
    }

    case 'TASK': {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
        take: 1,
      })
      const adminId = admins[0]?.id
      if (!adminId) break

      const task = await prisma.task.create({
        data: {
          title: (actionConfig.taskTitle || ruleName).replace('{companyName}', client.companyName),
          description: actionConfig.message || `Azione automatica touchpoint: ${ruleName}`,
          priority: (actionConfig.taskPriority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
          taskType: 'CRM',
          assigneeId: adminId,
          creatorId: adminId,
          clientId: client.id,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          tags: ['auto-touchpoint'],
          isPersonal: false,
        },
      })

      logActivity({
        userId: adminId,
        action: 'AUTO_CREATE',
        entityType: 'TASK',
        entityId: task.id,
        metadata: { trigger: 'touchpoint', rule: ruleName, brandSlug },
      })
      break
    }
  }
}

// ============================================================
// DEDUPLICATION
// ============================================================

async function isDuplicate(campaignName: string, clientId: string): Promise<boolean> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const existing = await prisma.campaignSend.findFirst({
    where: { campaignName, clientId, createdAt: { gte: thirtyDaysAgo } },
    select: { id: true },
  })
  return !!existing
}

// ============================================================
// SEED DEFAULT RULES
// ============================================================

export async function seedDefaultRules(brandSlug: string): Promise<number> {
  const existing = await prisma.touchpointRule.count({ where: { brandSlug } })
  if (existing > 0) return 0

  const rules = [
    {
      name: 'Inattivita 30 giorni - Notifica owner',
      triggerType: 'INACTIVITY',
      triggerConfig: { daysInactive: 30 } as Prisma.InputJsonValue,
      actionType: 'NOTIFICATION',
      actionConfig: { message: 'Nessuna interazione da 30 giorni' } as Prisma.InputJsonValue,
      brandSlug,
    },
    {
      name: 'Inattivita 60 giorni - Email re-engagement',
      triggerType: 'INACTIVITY',
      triggerConfig: { daysInactive: 60 } as Prisma.InputJsonValue,
      actionType: 'EMAIL',
      actionConfig: { subject: 'Ci manchi, {companyName}!', message: 'Non ci sentiamo da un po. Vorremmo aggiornarti sulle nostre novita.' } as Prisma.InputJsonValue,
      brandSlug,
    },
    {
      name: 'Anniversario cliente',
      triggerType: 'ANNIVERSARY',
      triggerConfig: {} as Prisma.InputJsonValue,
      actionType: 'EMAIL',
      actionConfig: { subject: 'Buon anniversario, {companyName}!', message: 'Festeggiamo insieme un altro anno di collaborazione.' } as Prisma.InputJsonValue,
      brandSlug,
    },
    {
      name: 'Deal vinto - Welcome',
      triggerType: 'DEAL_WON',
      triggerConfig: {} as Prisma.InputJsonValue,
      actionType: 'TASK',
      actionConfig: { taskTitle: 'Welcome & onboarding - {companyName}', taskPriority: 'HIGH' } as Prisma.InputJsonValue,
      brandSlug,
    },
  ]

  await prisma.touchpointRule.createMany({ data: rules })
  return rules.length
}
