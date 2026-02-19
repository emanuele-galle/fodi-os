import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const dependencies = await prisma.taskDependency.findMany({
      where: { taskId },
      include: {
        dependsOn: {
          select: { id: true, title: true, status: true },
        },
      },
    })
    return NextResponse.json(dependencies)
  } catch (e) {
    console.error('[tasks/dependencies/GET]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!role) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { taskId } = await params
    const body = await request.json()
    const { dependsOnId, type = 'finish_to_start' } = body

    if (!dependsOnId) {
      return NextResponse.json({ error: 'dependsOnId richiesto' }, { status: 400 })
    }

    if (dependsOnId === taskId) {
      return NextResponse.json({ error: 'Un task non può dipendere da se stesso' }, { status: 400 })
    }

    // Check for circular dependency
    const visited = new Set<string>()
    async function hasCircular(currentId: string): Promise<boolean> {
      if (currentId === taskId) return true
      if (visited.has(currentId)) return false
      visited.add(currentId)
      const deps = await prisma.taskDependency.findMany({
        where: { taskId: currentId },
        select: { dependsOnId: true },
      })
      for (const dep of deps) {
        if (await hasCircular(dep.dependsOnId)) return true
      }
      return false
    }

    if (await hasCircular(dependsOnId)) {
      return NextResponse.json({ error: 'Dipendenza circolare rilevata' }, { status: 400 })
    }

    const dependency = await prisma.taskDependency.create({
      data: { taskId, dependsOnId, type },
      include: {
        dependsOn: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    return NextResponse.json(dependency, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Dipendenza già esistente' }, { status: 409 })
    }
    console.error('[tasks/dependencies/POST]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!role) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { taskId } = await params
    const { searchParams } = new URL(request.url)
    const dependsOnId = searchParams.get('dependsOnId')

    if (!dependsOnId) {
      return NextResponse.json({ error: 'dependsOnId richiesto' }, { status: 400 })
    }

    await prisma.taskDependency.delete({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[tasks/dependencies/DELETE]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
