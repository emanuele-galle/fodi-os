import { brand } from '@/lib/branding'
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${brand.name} - Piattaforma Gestionale`,
    short_name: brand.slug.toUpperCase(),
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#27272A',
    theme_color: '#27272A',
    orientation: 'any',
    icons: [
      { src: brand.icons.favicon, sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: brand.icons.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: brand.icons.icon192, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: brand.icons.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: brand.icons.icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
