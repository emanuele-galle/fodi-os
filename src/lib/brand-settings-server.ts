import { prisma } from '@/lib/prisma'
import { brandClient } from '@/lib/branding-client'

export async function getBrandSettings() {
  const db = await prisma.brandSettings
    .findUnique({ where: { id: 'singleton' } })
    .catch(() => null)

  return {
    // Colori
    primary: db?.colorPrimary || brandClient.colors.primary,
    primaryDark: db?.colorPrimaryDark || brandClient.colors.primaryDark,
    gradientStart: db?.gradientStart || brandClient.colors.gradientStart,
    gradientMid: db?.gradientMid || brandClient.colors.gradientMid,
    gradientEnd: db?.gradientEnd || brandClient.colors.gradientEnd,
    // Identita
    brandName: db?.brandName || null,
    loginHeading: db?.loginHeading || null,
    loginSubtext: db?.loginSubtext || null,
    copyrightText: db?.copyrightText || null,
    // Logo
    logoDarkUrl: db?.logoDarkUrl || null,
    logoLightUrl: db?.logoLightUrl || null,
    faviconUrl: db?.faviconUrl || null,
    // Stile
    borderRadius: db?.borderRadius || 'xl',
  }
}
