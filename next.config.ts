import type { NextConfig } from 'next'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    APP_VERSION: pkg.version,
    NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME || process.env.BRAND_NAME || 'Muscari OS',
    NEXT_PUBLIC_BRAND_SLUG: process.env.NEXT_PUBLIC_BRAND_SLUG || process.env.BRAND_SLUG || 'muscari',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.fodivps1.cloud' },
      { protocol: 'https', hostname: 'storage.fodivps2.cloud' },
      ...(process.env.ALLOWED_IMAGE_DOMAINS || '')
        .split(',')
        .filter(Boolean)
        .map(hostname => ({ protocol: 'https' as const, hostname: hostname.trim() })),
    ],
  },
  async redirects() {
    return [
      { source: '/erp/dashboard/monthly', destination: '/erp/panoramica', permanent: true },
      { source: '/erp/dashboard/annual', destination: '/erp/panoramica?tab=annuale', permanent: true },
      { source: '/erp/dashboard/statistics', destination: '/erp/panoramica?tab=statistiche', permanent: true },
      { source: '/erp/expenses', destination: '/erp/movimenti', permanent: true },
      { source: '/erp/income', destination: '/erp/movimenti?tab=entrate', permanent: true },
      { source: '/erp/journal', destination: '/erp/movimenti?tab=prima-nota', permanent: true },
      { source: '/erp/expenses/subscriptions', destination: '/erp/ricorrenti', permanent: true },
      { source: '/erp/invoice-monitoring', destination: '/erp/ricorrenti?tab=fatture', permanent: true },
      { source: '/erp/templates', destination: '/erp/documenti', permanent: true },
      { source: '/erp/signatures', destination: '/erp/documenti?tab=firme', permanent: true },
      { source: '/erp/wizards', destination: '/erp/documenti?tab=wizard', permanent: true },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      '@tiptap/react',
      '@tiptap/starter-kit',
      'motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@radix-ui/react-select',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-separator',
      'zod',
    ],
  },
}

export default nextConfig
