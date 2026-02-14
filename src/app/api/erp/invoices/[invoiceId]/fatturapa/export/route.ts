import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { exportFatturapaSchema } from '@/lib/validation/fatturapa'
import { generateXmlFileName } from '@/lib/fatturapa'
import type { Role } from '@/generated/prisma/client'

// POST /api/erp/invoices/[invoiceId]/fatturapa/export - Export XML, set status EXPORTED
export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { invoiceId } = await params
    let body = {}
    try { body = await request.json() } catch { /* empty body ok, schema has defaults */ }
    const parsed = exportFatturapaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 })
    }

    const eInvoice = await prisma.electronicInvoice.findFirst({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })

    if (!eInvoice) {
      return NextResponse.json({ success: false, error: 'Fattura elettronica non trovata. Genera prima l\'XML.' }, { status: 404 })
    }

    if (!eInvoice.xmlContent) {
      return NextResponse.json({ success: false, error: 'XML non ancora generato' }, { status: 400 })
    }

    if (eInvoice.status !== 'GENERATED' && eInvoice.status !== 'generated') {
      return NextResponse.json({ success: false, error: `Impossibile esportare: stato attuale ${eInvoice.status}` }, { status: 400 })
    }

    // Generate standard filename if not present
    let xmlFileName = eInvoice.xmlFileName
    if (!xmlFileName) {
      const company = await prisma.companyProfile.findFirst()
      if (company) {
        const count = await prisma.electronicInvoice.count()
        xmlFileName = generateXmlFileName(company.partitaIva, count)
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.electronicInvoice.update({
        where: { id: eInvoice.id },
        data: {
          status: 'EXPORTED',
          xmlFileName,
          exportedAt: new Date(),
        },
      })

      await tx.eInvoiceStatusLog.create({
        data: {
          electronicInvoiceId: eInvoice.id,
          fromStatus: eInvoice.status,
          toStatus: 'EXPORTED',
          note: `Esportato come ${xmlFileName}`,
        },
      })

      return result
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[erp/invoices/:invoiceId/fatturapa/export]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
