import type { NextConfig } from 'next'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    APP_VERSION: pkg.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.fodivps2.cloud',
      },
      {
        protocol: 'https',
        hostname: 'os.fodisrl.it',
      },
      {
        protocol: 'https',
        hostname: 'fodi-os.fodivps2.cloud',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10gb',
    },
    middlewareClientMaxBodySize: '10gb',
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      '@tiptap/react',
      '@tiptap/starter-kit',
      'framer-motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@radix-ui/react-select',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-avatar',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      'zod',
    ],
  },
}

export default nextConfig
