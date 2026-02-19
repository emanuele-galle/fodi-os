import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Firma Documento - FODI OS',
  robots: { index: false, follow: false },
}

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return children
}
