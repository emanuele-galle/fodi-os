/**
 * Validates critical environment variables at import time.
 * Import this module early in the app lifecycle (e.g., from prisma.ts or instrumentation.ts).
 */

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_SECRET',
] as const

const optional = [
  'ANTHROPIC_API_KEY',
  'CRON_SECRET',
  'SMTP_HOST',
  'S3_ENDPOINT',
] as const

const missing = required.filter(key => !process.env[key])

if (missing.length > 0) {
  const msg = `[env] Missing required environment variables: ${missing.join(', ')}`
  // In production, crash immediately to prevent running with broken config
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  }
  console.warn(msg)
}

// Warn about optional but important vars
for (const key of optional) {
  if (!process.env[key]) {
    console.warn(`[env] Optional env var ${key} is not set — related features will be disabled`)
  }
}

// Side-effect module: validates env vars on import
