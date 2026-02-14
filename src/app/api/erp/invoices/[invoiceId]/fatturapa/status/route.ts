import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateStatusSchema } from '@/lib/validation/fatturapa'
import { VALID_STATUS_TRANSITIONS } from '@/lib/fatturapa'
import type { Role } from '@/generated/prisma/client'

// PATCH /api/erp/invoices/[invoiceId]/fatturapa/status - Update status manually with log
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { invoiceId } = await params
    const body = await request.json()
    const parsed = updateStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 })
    }

    const { status: newStatus, note, sdiIdentificativo } = parsed.data

    const eInvoice = await prisma.electronicInvoice.findFirst({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })

    if (!eInvoice) {
      return NextResponse.json({ success: false, error: 'Fattura elettronica non trovata' }, { status: 404 })
    }

    // Validate transition
    const currentStatus = eInvoice.status.toUpperCase()
    const validNextStates = VALID_STATUS_TRANSITIONS[currentStatus]
    if (validNextStates && !validNextStates.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: `Transizione non valida: ${currentStatus} -> ${newStatus}. Transizioni valide: ${validNextStates.join(', ') || 'nessuna'}` },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = { status: newStatus }
    if (sdiIdentificativo) updateData.sdiIdentificativo = sdiIdentificativo
    if (newStatus === 'UPLOADED_TO_SDI') updateData.uploadedAt = new Date()
    if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.electronicInvoice.update({
        where: { id: eInvoice.id },
        data: updateData,
      })

      await tx.eInvoiceStatusLog.create({
        data: {
          electronicInvoiceId: eInvoice.id,
          fromStatus: currentStatus,
          toStatus: newStatus,
          note: note || undefined,
          performedBy: request.headers.get('x-user-id') || undefined,
        },
      })

      return result
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[erp/invoices/:invoiceId/fatturapa/status]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
