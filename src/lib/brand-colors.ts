import { prisma } from '@/lib/prisma'
import { brandClient } from '@/lib/branding-client'

export async function getBrandColors() {
  const db = await prisma.brandSettings
    .findUnique({ where: { id: 'singleton' } })
    .catch(() => null)

  return {
    primary: db?.colorPrimary || brandClient.colors.primary,
    primaryDark: db?.colorPrimaryDark || brandClient.colors.primaryDark,
    gradientStart: db?.gradientStart || brandClient.colors.gradientStart,
    gradientMid: db?.gradientMid || brandClient.colors.gradientMid,
    gradientEnd: db?.gradientEnd || brandClient.colors.gradientEnd,
  }
}
