import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  cardBio: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  whatsappNumber: z.string().optional(),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  tiktokUrl: z.string().url().optional().or(z.literal('')),
  youtubeUrl: z.string().url().optional().or(z.literal('')),
  telegramUrl: z.string().url().optional().or(z.literal('')),
  showWizards: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  showBooking: z.boolean().optional(),
  bookingDuration: z.number().min(15).max(120).optional(),
  bookingDaysAhead: z.number().min(1).max(60).optional(),
  bookingStartHour: z.number().min(0).max(23).optional(),
  bookingEndHour: z.number().min(1).max(24).optional(),
})

function generateSlug(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user with card
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        digitalCard: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Auto-create card if doesn't exist
    if (!user.digitalCard) {
      const slug = generateSlug(user.firstName, user.lastName)
      const card = await prisma.digitalCard.create({
        data: {
          userId: user.id,
          slug,
          isEnabled: true,
          showWizards: false,
        },
      })
      return NextResponse.json({ ...card, user })
    }

    return NextResponse.json({ ...user.digitalCard, user })
  } catch (error) {
    console.error('GET /api/digital-card error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await request.json()

    // Convert null values to undefined for zod compatibility (Prisma returns null, zod expects undefined)
    const body: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rawBody)) {
      if (value === null) continue // skip nulls, zod treats missing keys as undefined
      body[key] = value
    }

    const data = updateSchema.parse(body)

    // Convert empty strings to null for URLs
    const cleanData = {
      ...data,
      linkedinUrl: data.linkedinUrl || null,
      instagramUrl: data.instagramUrl || null,
      twitterUrl: data.twitterUrl || null,
      githubUrl: data.githubUrl || null,
      websiteUrl: data.websiteUrl || null,
      whatsappNumber: data.whatsappNumber || null,
      facebookUrl: data.facebookUrl || null,
      tiktokUrl: data.tiktokUrl || null,
      youtubeUrl: data.youtubeUrl || null,
      telegramUrl: data.telegramUrl || null,
      jobTitle: data.jobTitle || null,
      department: data.department || null,
      cardBio: data.cardBio || null,
    }

    // Update or create card
    const card = await prisma.digitalCard.upsert({
      where: { userId },
      update: cleanData,
      create: {
        userId,
        slug: '', // Will be set properly if needed
        ...cleanData,
      },
    })

    return NextResponse.json(card)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('PUT /api/digital-card error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
