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
}

export default nextConfig
