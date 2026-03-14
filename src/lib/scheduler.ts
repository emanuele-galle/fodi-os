import { Cron } from 'croner'
import { logger } from '@/lib/logger'

const PORT = process.env.PORT || '3000'
const BASE_URL = `http://127.0.0.1:${PORT}`
const CRON_SECRET = process.env.CRON_SECRET

// Configurable schedules via environment variables
// Format: standard cron (minute hour day month weekday)
const SCHEDULES = {
  digest:         process.env.CRON_DIGEST         || '0 8 * * 1-5',   // Mon-Fri 08:00
  checkDeadlines: process.env.CRON_CHECK_DEADLINES || '0 8,14 * * 1-5', // Mon-Fri 08:00, 14:00
  reminders:      process.env.CRON_REMINDERS       || '0 9,15 * * 1-5', // Mon-Fri 09:00, 15:00
  reports:        process.env.CRON_REPORTS         || '0 21 * * 1-5',  // Mon-Fri 21:00
  recurringTasks: process.env.CRON_RECURRING_TASKS || '0 6 * * *',     // Daily 06:00
  healthScores:   process.env.CRON_HEALTH_SCORES   || '0 3 * * *',     // Daily 03:00
  aiSuggestions:  process.env.CRON_AI_SUGGESTIONS  || '0 7 * * 1-5',   // Mon-Fri 07:00
  touchpoints:    process.env.CRON_TOUCHPOINTS     || '0 8 * * *',     // Daily 08:00
  cleanup:        process.env.CRON_CLEANUP         || '0 4 * * *',     // Daily 04:00
}

async function callEndpoint(path: string, label: string) {
  if (!CRON_SECRET) {
    logger.warn(`[scheduler] CRON_SECRET not set, skipping ${label}`)
    return
  }

  const url = `${BASE_URL}${path}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` },
    })
    const data = await res.json().catch(() => null)
    if (res.ok) {
      logger.info(`[scheduler] ${label} OK`, { response: data })
    } else {
      logger.error(`[scheduler] ${label} ${res.status}`, { response: data })
    }
  } catch (err) {
    logger.error(`[scheduler] ${label} fetch error`, { error: err instanceof Error ? err.message : String(err) })
  }
}

const jobs: Cron[] = []

export function startScheduler() {
  if (!CRON_SECRET) {
    logger.warn('[scheduler] CRON_SECRET not configured — scheduler disabled')
    return
  }

  logger.info('[scheduler] Starting with schedules', {
    digest: SCHEDULES.digest,
    checkDeadlines: SCHEDULES.checkDeadlines,
    reminders: SCHEDULES.reminders,
    reports: SCHEDULES.reports,
    recurringTasks: SCHEDULES.recurringTasks,
    healthScores: SCHEDULES.healthScores,
    aiSuggestions: SCHEDULES.aiSuggestions,
    touchpoints: SCHEDULES.touchpoints,
    cleanup: SCHEDULES.cleanup,
  })

  jobs.push(
    new Cron(SCHEDULES.digest, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/digest/send', 'digest')
    }),
    new Cron(SCHEDULES.checkDeadlines, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/tasks/check-deadlines', 'check-deadlines')
    }),
    new Cron(SCHEDULES.reminders, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/reminders/generate', 'reminders')
    }),
    new Cron(SCHEDULES.reports, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/team/reports/generate', 'reports')
    }),
    new Cron(SCHEDULES.recurringTasks, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/tasks/generate-recurring', 'recurring-tasks')
    }),
    new Cron(SCHEDULES.healthScores, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/crm/health/recalculate', 'health-scores')
    }),
    new Cron(SCHEDULES.aiSuggestions, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/crm/suggestions/generate', 'ai-suggestions')
    }),
    new Cron(SCHEDULES.touchpoints, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/crm/touchpoints/process', 'touchpoints')
    }),
    new Cron(SCHEDULES.cleanup, { timezone: 'Europe/Rome' }, () => {
      callEndpoint('/api/cleanup', 'cleanup')
    }),
  )

  logger.info('[scheduler] All cron jobs registered')
}

