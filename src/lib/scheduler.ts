import { Cron } from 'croner'

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
}

async function callEndpoint(path: string, label: string) {
  if (!CRON_SECRET) {
    console.warn(`[scheduler] CRON_SECRET not set, skipping ${label}`)
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
      console.log(`[scheduler] ${label} OK:`, JSON.stringify(data))
    } else {
      console.error(`[scheduler] ${label} ${res.status}:`, JSON.stringify(data))
    }
  } catch (err) {
    console.error(`[scheduler] ${label} fetch error:`, err instanceof Error ? err.message : err)
  }
}

const jobs: Cron[] = []

export function startScheduler() {
  if (!CRON_SECRET) {
    console.warn('[scheduler] CRON_SECRET not configured — scheduler disabled')
    return
  }

  console.log('[scheduler] Starting with schedules:')
  console.log(`  digest:          ${SCHEDULES.digest}`)
  console.log(`  check-deadlines: ${SCHEDULES.checkDeadlines}`)
  console.log(`  reminders:       ${SCHEDULES.reminders}`)
  console.log(`  reports:         ${SCHEDULES.reports}`)

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
  )

  console.log('[scheduler] All cron jobs registered')
}

export function stopScheduler() {
  for (const job of jobs) job.stop()
  jobs.length = 0
  console.log('[scheduler] All cron jobs stopped')
}
