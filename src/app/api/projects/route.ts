import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import { createProjectSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { searchParams } = request.nextUrl
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')
    const isInternal = searchParams.get('isInternal')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      isArchived: false,
      ...(workspaceId && { workspaceId }),
      ...(status && { status: status as never }),
      ...(isInternal !== null && { isInternal: isInternal === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.project.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { workspaceId, clientId, name, description, priority, startDate, endDate, deadline, budgetAmount, budgetHours, color, isInternal } = parsed.data

    const slug = slugify(name)

    const existing = await prisma.project.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'A project with this name already exists' }, { status: 409 })
    }

    const userId = request.headers.get('x-user-id')!

    const project = await prisma.project.create({
      data: {
        workspaceId,
        clientId,
        name,
        slug,
        description,
        priority,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        budgetAmount,
        budgetHours,
        color,
        isInternal,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        _count: { select: { tasks: true } },
      },
    })

    // Auto-create a PROJECT chat channel
    try {
      await prisma.chatChannel.create({
        data: {
          name: `${name}`,
          slug: `project-${slug}`,
          description: `Chat del progetto ${name}`,
          type: 'PROJECT',
          projectId: project.id,
          createdById: userId,
          members: {
            create: [{ userId, role: 'OWNER' }],
          },
        },
      })
    } catch {
      // Non-blocking: if chat channel creation fails, project is still created
    }

    return NextResponse.json(project, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
