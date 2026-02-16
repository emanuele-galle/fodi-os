import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FODI OS - Piattaforma Gestionale',
  description: 'Piattaforma di gestione aziendale FODI Srl - CRM, Progetti, Contabilita, Team',
  metadataBase: new URL('https://os.fodisrl.it'),
  openGraph: {
    title: 'FODI OS - Piattaforma Gestionale',
    description: 'Gestionale aziendale completo: CRM, Project Management, Contabilita, Team e molto altro.',
    url: 'https://os.fodisrl.it',
    siteName: 'FODI OS',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FODI OS - Piattaforma Gestionale Aziendale',
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FODI OS - Piattaforma Gestionale',
    description: 'Gestionale aziendale completo: CRM, Project Management, Contabilita, Team e molto altro.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <head>
        <meta name="theme-color" content="#27272A" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  )
}
