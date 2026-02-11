import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
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
