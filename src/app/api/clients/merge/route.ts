import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'

const mergeSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  fields: z.record(z.string(), z.enum(['source', 'target'])),
  mergeRelations: z.array(z.string()),
})

const MERGEABLE_FIELDS = [
  'companyName', 'vatNumber', 'fiscalCode', 'pec', 'sdi',
  'website', 'industry', 'source', 'status', 'notes',
] as const

const RELATION_MAP: Record<string, string> = {
  contacts: 'contact',
  interactions: 'interaction',
  projects: 'project',
  quotes: 'quote',
  tickets: 'ticket',
  documents: 'document',
  quoteTemplates: 'quoteTemplate',
  signatureRequests: 'signatureRequest',
  tasks: 'task',
  deals: 'deal',
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'crm', 'admin')

    const body = await request.json()
    const parsed = mergeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { sourceId, targetId, fields, mergeRelations } = parsed.data

    if (sourceId === targetId) {
      return NextResponse.json(
        { success: false, error: 'Non puoi unire un cliente con se stesso' },
        { status: 400 }
      )
    }

    const [source, target] = await Promise.all([
      prisma.client.findUnique({ where: { id: sourceId } }),
      prisma.client.findUnique({ where: { id: targetId } }),
    ])

    if (!source || !target) {
      return NextResponse.json(
        { success: false, error: 'Uno o entrambi i clienti non esistono' },
        { status: 404 }
      )
    }

    // Backup source client in activity log (before transaction, intentionally persists on failure)
    logActivity({
      userId,
      action: 'MERGE_CLIENT_BACKUP',
      entityType: 'CLIENT',
      entityId: sourceId,
      metadata: { backup: JSON.stringify(source) },
    })

    const result = await prisma.$transaction(async (tx) => {
      // 1. Build update data from chosen fields
      const updateData: Record<string, unknown> = {}
      const sourceRecord = source as unknown as Record<string, unknown>
      for (const field of MERGEABLE_FIELDS) {
        if (fields[field as string] === 'source') {
          updateData[field] = sourceRecord[field]
        }
        // 'target' means keep current value, no update needed
      }

      // 3. Merge tags (union, deduplicated)
      const mergedTags = [...new Set([...target.tags, ...source.tags])]
      updateData.tags = mergedTags

      // 4. Update target client with chosen fields
      await tx.client.update({
        where: { id: targetId },
        data: updateData,
      })

      // 5. Move relations from source to target
      for (const relation of mergeRelations) {
        const model = RELATION_MAP[relation]
        if (!model) continue

        // Use dynamic access to prisma models
        const prismaModel = (tx as Record<string, unknown>)[model] as {
          updateMany: (args: { where: Record<string, string>; data: Record<string, string> }) => Promise<unknown>
        } | undefined
        if (prismaModel) {
          await prismaModel.updateMany({
            where: { clientId: sourceId },
            data: { clientId: targetId },
          })
        }
      }

      // 6. Delete source client
      await tx.client.delete({ where: { id: sourceId } })

      return { targetId }
    })

    // Log the merge action
    logActivity({
      userId,
      action: 'MERGE_CLIENT',
      entityType: 'CLIENT',
      entityId: targetId,
      metadata: {
        sourceId,
        targetId,
        mergedFields: Object.keys(fields).filter(k => fields[k] === 'source').join(','),
        mergedRelations: mergeRelations.join(','),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/merge/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
