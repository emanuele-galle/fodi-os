import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * POST /api/cleanup
 * Cleans up expired records. Called by scheduler with CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Record<string, number> = {}

  try {
    // 1. Revoked/expired refresh tokens (older than 7 days past expiry)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const refreshTokens = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { isRevoked: true, createdAt: { lt: sevenDaysAgo } },
          { expiresAt: { lt: sevenDaysAgo } },
        ],
      },
    })
    results.refreshTokens = refreshTokens.count

    // 2. Expired login OTPs (older than 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const loginOtps = await prisma.loginOtp.deleteMany({
      where: { expiresAt: { lt: oneDayAgo } },
    })
    results.loginOtps = loginOtps.count

    // 3. Expired signature OTPs (older than 24 hours)
    const signatureOtps = await prisma.signatureOtp.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: oneDayAgo } },
          { isUsed: true, createdAt: { lt: oneDayAgo } },
        ],
      },
    })
    results.signatureOtps = signatureOtps.count

    // 4. Expired pending signature requests → mark as EXPIRED
    const expiredRequests = await prisma.signatureRequest.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    })
    results.expiredSignatureRequests = expiredRequests.count

    // 5. Old activity logs (older than 6 months)
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    const activityLogs = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: sixMonthsAgo } },
    })
    results.activityLogs = activityLogs.count

    logger.info('[cleanup] Completed', results)
    return NextResponse.json({ success: true, cleaned: results })
  } catch (err) {
    logger.error('[cleanup] Error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
