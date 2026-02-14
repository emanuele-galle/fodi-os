import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const q = request.nextUrl.searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const results: Record<string, unknown[]> = {
      clients: [],
      projects: [],
      tasks: [],
      quotes: [],
      tickets: [],
    }

    const searches = []

    if (hasPermission(role, 'crm', 'read')) {
      searches.push(
        prisma.client.findMany({
          where: { companyName: { contains: q, mode: 'insensitive' } },
          select: { id: true, companyName: true, status: true, slug: true },
          take: 5,
        }).then(r => { results.clients = r })
      )
    }

    if (hasPermission(role, 'pm', 'read')) {
      searches.push(
        prisma.project.findMany({
          where: { name: { contains: q, mode: 'insensitive' }, isArchived: false },
          select: { id: true, name: true, status: true, slug: true },
          take: 5,
        }).then(r => { results.projects = r })
      )

      searches.push(
        prisma.task.findMany({
          where: { title: { contains: q, mode: 'insensitive' } },
          select: { id: true, title: true, status: true, projectId: true },
          take: 5,
        }).then(r => { results.tasks = r })
      )
    }

    if (hasPermission(role, 'erp', 'read')) {
      searches.push(
        prisma.quote.findMany({
          where: {
            OR: [
              { number: { contains: q, mode: 'insensitive' } },
              { title: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: { id: true, number: true, title: true, status: true },
          take: 5,
        }).then(r => { results.quotes = r })
      )

    }

    if (hasPermission(role, 'support', 'read')) {
      searches.push(
        prisma.ticket.findMany({
          where: {
            OR: [
              { number: { contains: q, mode: 'insensitive' } },
              { subject: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: { id: true, number: true, subject: true, status: true },
          take: 5,
        }).then(r => { results.tickets = r })
      )
    }

    await Promise.all(searches)

    return NextResponse.json(results)
  } catch (e) {
    console.error('[search]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
