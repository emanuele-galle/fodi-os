/* eslint-disable react-perf/jsx-no-new-object-as-prop -- component handlers and dynamic props */
import { brand } from '@/lib/branding'
import { getBrandColors } from '@/lib/brand-colors'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: `${brand.name} - Piattaforma Gestionale`,
  description: brand.description,
  metadataBase: new URL(brand.siteUrl),
  openGraph: {
    title: `${brand.name} - Piattaforma Gestionale`,
    description: 'Gestionale aziendale completo: CRM, Project Management, Contabilita, Team e molto altro.',
    url: brand.siteUrl,
    siteName: brand.name,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${brand.name} - Piattaforma Gestionale Aziendale`,
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brand.name} - Piattaforma Gestionale`,
    description: 'Gestionale aziendale completo: CRM, Project Management, Contabilita, Team e molto altro.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: brand.icons.faviconSvg, type: 'image/svg+xml' },
      { url: brand.icons.favicon, type: 'image/png', sizes: '128x128' },
    ],
    apple: [
      { url: brand.icons.apple, sizes: '180x180' },
      { url: brand.icons.icon192, sizes: '192x192' },
    ],
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const colors = await getBrandColors()
  return (
    <html lang="it" style={{
        '--brand-gradient': `linear-gradient(135deg, ${colors.gradientStart} 0%, ${colors.gradientMid} 50%, ${colors.gradientEnd} 100%)`,
        '--brand-primary': colors.primary,
        '--brand-primary-dark': colors.primaryDark,
      } as React.CSSProperties}>
      <head>
        <meta name="theme-color" content="#F2F2F7" id="theme-color-meta" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
          <meta name="vapid-public-key" content={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='${brand.storageKeys.theme}';var t=localStorage.getItem(k);if(t==='system'||!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}if(t!=='light'&&t!=='dark')t='light';document.documentElement.setAttribute('data-theme',t);var m=document.getElementById('theme-color-meta');if(m)m.setAttribute('content',t==='dark'?'#000000':'#F2F2F7')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){})}`,
          }}
        />
      </body>
    </html>
  )
}
