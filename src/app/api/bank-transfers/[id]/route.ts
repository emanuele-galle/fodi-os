import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import type { Role } from '@/generated/prisma/client'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')
    const { id } = await params

    const existing = await prisma.bankTransfer.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Giroconto non trovato' }, { status: 404 })

    // Delete and rollback balances in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.bankTransfer.delete({ where: { id } })

      await tx.bankAccount.update({
        where: { id: existing.fromAccountId },
        data: { balance: { increment: Number(existing.amount) } },
      })

      await tx.bankAccount.update({
        where: { id: existing.toAccountId },
        data: { balance: { decrement: Number(existing.amount) } },
      })
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'BANK_TRANSFER', entityId: id, metadata: { amount: String(existing.amount) } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[bank-transfer-delete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
