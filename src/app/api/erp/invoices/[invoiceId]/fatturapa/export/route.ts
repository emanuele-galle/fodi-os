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
      return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 })
    }

    const eInvoice = await prisma.electronicInvoice.findFirst({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })

    if (!eInvoice) {
      return NextResponse.json({ error: 'Fattura elettronica non trovata. Genera prima l\'XML.' }, { status: 404 })
    }

    if (!eInvoice.xmlContent) {
      return NextResponse.json({ error: 'XML non ancora generato' }, { status: 400 })
    }

    if (eInvoice.status !== 'GENERATED' && eInvoice.status !== 'generated') {
      return NextResponse.json({ error: `Impossibile esportare: stato attuale ${eInvoice.status}` }, { status: 400 })
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

    const updated = await prisma.electronicInvoice.update({
      where: { id: eInvoice.id },
      data: {
        status: 'EXPORTED',
        xmlFileName,
        exportedAt: new Date(),
      },
    })

    await prisma.eInvoiceStatusLog.create({
      data: {
        electronicInvoiceId: eInvoice.id,
        fromStatus: eInvoice.status,
        toStatus: 'EXPORTED',
        note: `Esportato come ${xmlFileName}`,
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
