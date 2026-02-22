import { brand } from '@/lib/branding'
import type { Metadata } from 'next'
import PortalShell from '@/components/portal/PortalShell'

export const metadata: Metadata = {
  title: `Portale Cliente - ${brand.name}`,
  robots: { index: false, follow: false },
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PortalShell>{children}</PortalShell>
}
