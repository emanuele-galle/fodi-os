import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { z } from 'zod'
import type { Role, ClientStatus } from '@/generated/prisma/client'

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Seleziona almeno un cliente').max(100, 'Massimo 100 clienti'),
  action: z.enum(['status', 'tags', 'delete']),
  value: z.unknown().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!

    const body = await request.json()
    const parsed = bulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { ids, action, value } = parsed.data

    if (action === 'delete') {
      requirePermission(role, 'crm', 'delete')
      await prisma.client.deleteMany({ where: { id: { in: ids } } })
      logActivity({ userId, action: 'DELETE', entityType: 'CLIENT', entityId: 'bulk', metadata: { count: ids.length } })
      return NextResponse.json({ success: true, count: ids.length })
    }

    requirePermission(role, 'crm', 'write')

    if (action === 'status') {
      const validStatuses = ['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']
      if (!validStatuses.includes(value as string)) {
        return NextResponse.json({ success: false, error: 'Stato non valido' }, { status: 400 })
      }
      await prisma.client.updateMany({
        where: { id: { in: ids } },
        data: { status: value as ClientStatus },
      })
      logActivity({ userId, action: 'UPDATE', entityType: 'CLIENT', entityId: 'bulk', metadata: { count: ids.length, status: String(value) } })
      return NextResponse.json({ success: true, count: ids.length })
    }

    if (action === 'tags') {
      const tagsToAdd = z.array(z.string()).safeParse(value)
      if (!tagsToAdd.success) {
        return NextResponse.json({ success: false, error: 'Tag non validi' }, { status: 400 })
      }
      const clients = await prisma.client.findMany({
        where: { id: { in: ids } },
        select: { id: true, tags: true },
      })
      const updates = clients.map(c =>
        prisma.client.update({
          where: { id: c.id },
          data: { tags: [...new Set([...c.tags, ...tagsToAdd.data])] },
        })
      )
      await Promise.all(updates)
      logActivity({ userId, action: 'UPDATE', entityType: 'CLIENT', entityId: 'bulk', metadata: { count: ids.length, tags: tagsToAdd.data.join(',') } })
      return NextResponse.json({ success: true, count: ids.length })
    }

    return NextResponse.json({ success: false, error: 'Azione non valida' }, { status: 400 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/bulk/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
