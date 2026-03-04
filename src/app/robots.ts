import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://os.fodisrl.it'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/c/', '/sign/'],
        disallow: [
          '/dashboard/',
          '/portal/',
          '/api/',
          '/login',
          '/forgot-password',
          '/verify-ip',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
