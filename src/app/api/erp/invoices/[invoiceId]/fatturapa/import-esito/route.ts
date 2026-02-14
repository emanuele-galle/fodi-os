import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { importEsitoSchema } from '@/lib/validation/fatturapa'
import { parseEsitoXml } from '@/lib/fatturapa'
import type { Role } from '@/generated/prisma/client'

// Status mappings based on esito type
const ESITO_STATUS_MAP: Record<string, string> = {
  NS: 'REJECTED',
  RC: 'DELIVERED',
  MC: 'UPLOADED_TO_SDI', // Keep in uploaded state, will retry
  NE: 'REJECTED',
  DT: 'DECOURSA',
  AT: 'DELIVERED',
}

// POST /api/erp/invoices/[invoiceId]/fatturapa/import-esito - Import SDI response XML
export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { invoiceId } = await params
    const body = await request.json()
    const parsed = importEsitoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 })
    }

    const eInvoice = await prisma.electronicInvoice.findFirst({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })

    if (!eInvoice) {
      return NextResponse.json({ error: 'Fattura elettronica non trovata' }, { status: 404 })
    }

    // Parse the esito XML
    let esito
    try {
      esito = parseEsitoXml(parsed.data.esitoXml)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Errore nel parsing dell\'XML esito' },
        { status: 400 }
      )
    }

    const newStatus = ESITO_STATUS_MAP[esito.esitoType] || eInvoice.status
    const previousStatus = eInvoice.status

    const updated = await prisma.electronicInvoice.update({
      where: { id: eInvoice.id },
      data: {
        status: newStatus,
        esitoType: esito.esitoType,
        esitoDescription: esito.description,
        esitoXml: parsed.data.esitoXml,
        sdiIdentificativo: esito.sdiIdentificativo || eInvoice.sdiIdentificativo,
        sdiDataRicezione: esito.dataRicezione ? new Date(esito.dataRicezione) : undefined,
      },
    })

    await prisma.eInvoiceStatusLog.create({
      data: {
        electronicInvoiceId: eInvoice.id,
        fromStatus: previousStatus,
        toStatus: newStatus,
        note: `Esito ${esito.esitoType}: ${esito.description}`,
        performedBy: request.headers.get('x-user-id') || undefined,
      },
    })

    return NextResponse.json({ ...updated, parsedEsito: esito })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
