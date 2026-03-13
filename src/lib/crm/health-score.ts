import { prisma } from '@/lib/prisma'

// ============================================================
// TYPES
// ============================================================

interface HealthBreakdown {
  overallScore: number
  interactionScore: number
  pipelineScore: number
  projectScore: number
  revenueScore: number
  engagementScore: number
  riskLevel: string
}

interface NextAction {
  action: string
  priority: string
  dueDate: string | null
  reason: string
}

// ============================================================
// WEIGHTS
// ============================================================

const WEIGHTS = {
  interaction: 0.3,
  pipeline: 0.25,
  project: 0.2,
  revenue: 0.15,
  engagement: 0.1,
} as const

// ============================================================
// SUB-SCORE CALCULATORS
// ============================================================

function calcInteractionScore(
  lastInteractionDate: Date | null,
  interactionCount90d: number,
): number {
  // Recency (60% weight)
  let recencyScore = 0
  if (lastInteractionDate) {
    const daysSince = Math.floor(
      (Date.now() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysSince <= 7) recencyScore = 100
    else if (daysSince <= 14) recencyScore = 80
    else if (daysSince <= 30) recencyScore = 60
    else if (daysSince <= 60) recencyScore = 40
    else if (daysSince <= 90) recencyScore = 20
    else recencyScore = 0
  }

  // Frequency (40% weight) — benchmark: 1 interaction/week = 100
  const frequencyScore = Math.min(100, Math.round((interactionCount90d / 12) * 100))

  return Math.round(recencyScore * 0.6 + frequencyScore * 0.4)
}

function calcPipelineScore(
  openDealsValue: number,
  avgProbability: number,
  recentWonCount: number,
  recentLostWithoutNew: boolean,
): number {
  // Weighted pipeline value (normalized to 0-40 points)
  const weightedValue = openDealsValue * (avgProbability / 100)
  const valueScore = Math.min(40, Math.round((weightedValue / 50000) * 40))

  // Recent wins bonus (0-40 points)
  const winBonus = Math.min(40, recentWonCount * 20)

  // Lost without replacement penalty
  const lostPenalty = recentLostWithoutNew ? 20 : 0

  // Active deals existence bonus (0-20 points)
  const activeBonus = openDealsValue > 0 ? 20 : 0

  return Math.min(100, Math.max(0, valueScore + winBonus + activeBonus - lostPenalty))
}

function calcProjectScore(
  activeProjects: number,
  overdueTaskCount: number,
  recentTaskActivity: boolean,
): number {
  if (activeProjects === 0) return 30 // No projects = neutral-low

  let score = 50 // Base for having projects

  // Active projects bonus
  score += Math.min(20, activeProjects * 10)

  // Overdue tasks penalty
  score -= Math.min(30, overdueTaskCount * 10)

  // Recent activity bonus
  if (recentTaskActivity) score += 20

  return Math.min(100, Math.max(0, score))
}

function calcRevenueScore(
  clientRevenue: number,
  avgCompanyRevenue: number,
): number {
  if (avgCompanyRevenue <= 0) return clientRevenue > 0 ? 70 : 30
  const ratio = clientRevenue / avgCompanyRevenue
  if (ratio >= 3) return 100
  if (ratio >= 2) return 90
  if (ratio >= 1.5) return 80
  if (ratio >= 1) return 70
  if (ratio >= 0.5) return 50
  if (ratio >= 0.25) return 30
  return clientRevenue > 0 ? 20 : 10
}

function calcEngagementScore(
  hasPortalUser: boolean,
  quoteAcceptanceRate: number,
): number {
  let score = 30 // Base
  if (hasPortalUser) score += 35
  // Quote acceptance: 0-35 points
  score += Math.round(quoteAcceptanceRate * 35)
  return Math.min(100, score)
}

function determineRiskLevel(score: number): string {
  if (score >= 70) return 'HEALTHY'
  if (score >= 50) return 'AT_RISK'
  if (score >= 30) return 'CRITICAL'
  return 'CHURNING'
}

// ============================================================
// MAIN CALCULATOR
// ============================================================

async function calculateClientHealth(clientId: string): Promise<HealthBreakdown> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  // Gather all data in parallel
  const [
    client,
    interactionCount90d,
    lastInteraction,
    openDeals,
    recentWonDeals,
    recentLostDeals,
    activeProjects,
    overdueTaskCount,
    recentTaskActivity,
    avgRevenueResult,
    totalQuotes,
    acceptedQuotes,
  ] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        totalRevenue: true,
        portalUserId: true,
        status: true,
      },
    }),
    prisma.interaction.count({
      where: { clientId, date: { gte: ninetyDaysAgo } },
    }),
    prisma.interaction.findFirst({
      where: { clientId },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.deal.findMany({
      where: {
        clientId,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
      select: { value: true, probability: true },
    }),
    prisma.deal.count({
      where: {
        clientId,
        stage: 'CLOSED_WON',
        actualCloseDate: { gte: sixMonthsAgo },
      },
    }),
    prisma.deal.count({
      where: {
        clientId,
        stage: 'CLOSED_LOST',
        actualCloseDate: { gte: ninetyDaysAgo },
      },
    }),
    prisma.project.count({
      where: {
        clientId,
        status: { in: ['IN_PROGRESS', 'REVIEW'] },
      },
    }),
    prisma.task.count({
      where: {
        clientId,
        status: { notIn: ['DONE', 'CANCELLED'] },
        dueDate: { lt: now },
      },
    }),
    prisma.task.findFirst({
      where: {
        clientId,
        updatedAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    }),
    prisma.client.aggregate({
      _avg: { totalRevenue: true },
      where: { status: { in: ['ACTIVE', 'PROSPECT'] } },
    }),
    prisma.quote.count({ where: { clientId } }),
    prisma.quote.count({ where: { clientId, status: 'APPROVED' } }),
  ])

  if (!client) throw new Error('Client not found')

  const clientRevenue = Number(client.totalRevenue)
  const avgRevenue = Number(avgRevenueResult._avg.totalRevenue ?? 0)

  const openDealsValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0)
  const avgProb = openDeals.length > 0
    ? openDeals.reduce((sum, d) => sum + d.probability, 0) / openDeals.length
    : 0

  const hasNewDealsAfterLoss = openDeals.length > 0
  const recentLostWithoutNew = recentLostDeals > 0 && !hasNewDealsAfterLoss

  const quoteAcceptanceRate = totalQuotes > 0 ? acceptedQuotes / totalQuotes : 0

  // Calculate sub-scores
  const interactionScore = calcInteractionScore(
    lastInteraction?.date ?? null,
    interactionCount90d,
  )
  const pipelineScore = calcPipelineScore(
    openDealsValue,
    avgProb,
    recentWonDeals,
    recentLostWithoutNew,
  )
  const projectScore = calcProjectScore(
    activeProjects,
    overdueTaskCount,
    !!recentTaskActivity,
  )
  const revenueScore = calcRevenueScore(clientRevenue, avgRevenue)
  const engagementScore = calcEngagementScore(
    !!client.portalUserId,
    quoteAcceptanceRate,
  )

  // Weighted overall
  const overallScore = Math.round(
    interactionScore * WEIGHTS.interaction +
    pipelineScore * WEIGHTS.pipeline +
    projectScore * WEIGHTS.project +
    revenueScore * WEIGHTS.revenue +
    engagementScore * WEIGHTS.engagement,
  )

  const riskLevel = determineRiskLevel(overallScore)

  return {
    overallScore,
    interactionScore,
    pipelineScore,
    projectScore,
    revenueScore,
    engagementScore,
    riskLevel,
  }
}

// ============================================================
// UPSERT WITH HISTORY
// ============================================================

export async function updateClientHealthScore(clientId: string): Promise<HealthBreakdown> {
  const breakdown = await calculateClientHealth(clientId)

  // Get existing record for history
  const existing = await prisma.clientHealthScore.findUnique({
    where: { clientId },
    select: { scoreHistory: true },
  })

  // Append to history (keep last 12 monthly snapshots)
  const history = (existing?.scoreHistory as { date: string; score: number }[] | null) ?? []
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Update or add current month
  const existingIdx = history.findIndex((h) => h.date === monthKey)
  if (existingIdx >= 0) {
    history[existingIdx].score = breakdown.overallScore
  } else {
    history.push({ date: monthKey, score: breakdown.overallScore })
  }
  // Keep only last 12
  const trimmedHistory = history.slice(-12)

  await prisma.clientHealthScore.upsert({
    where: { clientId },
    create: {
      clientId,
      ...breakdown,
      lastCalculatedAt: now,
      scoreHistory: trimmedHistory,
    },
    update: {
      ...breakdown,
      lastCalculatedAt: now,
      scoreHistory: trimmedHistory,
    },
  })

  return breakdown
}

// ============================================================
// NEXT ACTIONS GENERATOR
// ============================================================

export function generateNextActions(
  breakdown: HealthBreakdown,
  lastInteractionDate: Date | null,
): NextAction[] {
  const actions: NextAction[] = []

  if (breakdown.interactionScore < 40) {
    const daysSince = lastInteractionDate
      ? Math.floor((Date.now() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999
    actions.push({
      action: 'Contattare il cliente',
      priority: daysSince > 60 ? 'URGENT' : 'HIGH',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      reason: `Nessuna interazione da ${daysSince} giorni`,
    })
  }

  if (breakdown.pipelineScore < 30) {
    actions.push({
      action: 'Valutare nuove opportunità commerciali',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Pipeline vuota o in calo',
    })
  }

  if (breakdown.projectScore < 40) {
    actions.push({
      action: 'Verificare stato progetti attivi',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Task scaduti o progetti fermi',
    })
  }

  if (breakdown.riskLevel === 'CHURNING') {
    actions.push({
      action: 'Intervento urgente di retention',
      priority: 'URGENT',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Cliente a rischio abbandono',
    })
  }

  return actions
}

// ============================================================
// BATCH RECALCULATE
// ============================================================

export async function recalculateAllHealthScores(): Promise<{ processed: number; errors: number }> {
  const clients = await prisma.client.findMany({
    where: { status: { in: ['ACTIVE', 'PROSPECT', 'LEAD'] } },
    select: { id: true },
  })

  let processed = 0
  let errors = 0

  for (const client of clients) {
    try {
      await updateClientHealthScore(client.id)
      processed++
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
