import { brand } from '@/lib/branding'
import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'nodejs'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const card = await prisma.digitalCard.findUnique({
    where: { slug },
    include: { user: { select: { firstName: true, lastName: true } } }
  })

  const name = card ? `${card.user.firstName} ${card.user.lastName}` : brand.slug.toUpperCase()
  const title = card?.jobTitle || ''

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          position: 'relative'
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 16 }}>{name}</div>
        {title && <div style={{ fontSize: 32, opacity: 0.85 }}>{title}</div>}
        <div style={{ position: 'absolute', bottom: 40, right: 60, fontSize: 24, opacity: 0.6 }}>{brand.slug.toUpperCase()}</div>
      </div>
    ),
    { ...size }
  )
}
