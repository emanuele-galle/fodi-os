import { prisma } from '@/lib/prisma'

interface LogActivityParams {
  userId: string
  action: string
  entityType: string
  entityId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}

/**
 * Logs a user action for audit trail.
 * Fire-and-forget: errors are silently caught to never block the main operation.
 */
export function logActivity(params: LogActivityParams): void {
  prisma.activityLog
    .create({ data: params })
    .catch(() => {
      // Silently fail - activity logging should never block operations
    })
}
