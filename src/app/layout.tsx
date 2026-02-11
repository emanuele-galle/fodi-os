import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FODI OS - Piattaforma Gestionale',
  description: 'Piattaforma di gestione aziendale FODI Srl',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  )
}
