import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// GET /api/erp/invoices/[invoiceId]/fatturapa/history - Get status change history
export async function GET(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { invoiceId } = await params

    const eInvoice = await prisma.electronicInvoice.findFirst({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })

    if (!eInvoice) {
      return NextResponse.json({ success: true, data: [] })
    }

    const logs = await prisma.eInvoiceStatusLog.findMany({
      where: { electronicInvoiceId: eInvoice.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[erp/invoices/:invoiceId/fatturapa/history]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
