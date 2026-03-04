import type { NextConfig } from 'next'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['googleapis'],
  env: {
    APP_VERSION: pkg.version,
    NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME || process.env.BRAND_NAME || 'Muscari OS',
    NEXT_PUBLIC_BRAND_SLUG: process.env.NEXT_PUBLIC_BRAND_SLUG || process.env.BRAND_SLUG || 'muscari',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's3.fodivps1.cloud' },
      { protocol: 'https', hostname: 'storage.fodivps1.cloud' },
      { protocol: 'https', hostname: 'storage.fodivps2.cloud' },
      { protocol: 'https', hostname: 'files.fodisrl.it' },
      { protocol: 'https', hostname: 'www.gstatic.com' },
      ...(process.env.ALLOWED_IMAGE_DOMAINS || '')
        .split(',')
        .filter(Boolean)
        .map(hostname => ({ protocol: 'https' as const, hostname: hostname.trim() })),
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
  experimental: {
    middlewareClientMaxBodySize: '100mb',
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
