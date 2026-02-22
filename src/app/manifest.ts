import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.BRAND_NAME || 'Muscari OS'
  const slug = process.env.BRAND_SLUG || 'muscari'

  return {
    id: '/',
    name: `${name} - Piattaforma Gestionale`,
    short_name: slug.toUpperCase(),
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#27272A',
    theme_color: '#27272A',
    orientation: 'any',
    icons: [
      { src: '/favicon.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
