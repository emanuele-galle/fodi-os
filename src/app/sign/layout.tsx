import { brand } from '@/lib/branding'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `Firma Documento - ${brand.name}`,
  robots: { index: false, follow: false },
}

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return children
}
