import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://os.fodisrl.it'

  const cards = await prisma.digitalCard.findMany({
    where: { isEnabled: true },
    select: { slug: true, updatedAt: true },
  })

  return cards.map((card) => ({
    url: `${baseUrl}/c/${card.slug}`,
    lastModified: card.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
}
