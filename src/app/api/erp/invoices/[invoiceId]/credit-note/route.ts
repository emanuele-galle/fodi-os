import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { creditNoteSchema } from '@/lib/validation/fatturapa'
import { generateFatturaPA, validateFatturaPA, generateXmlFileName } from '@/lib/fatturapa'
import type { Role } from '@/generated/prisma/client'

// POST /api/erp/invoices/[invoiceId]/credit-note - Create credit note (TD04)
export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { invoiceId } = await params
    const body = await request.json()
    const parsed = creditNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 })
    }

    // Fetch original invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Fattura originale non trovata' }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()
    if (!company) {
      return NextResponse.json({ success: false, error: 'Profilo azienda non configurato' }, { status: 400 })
    }

    // Use provided lineItems or copy from original invoice
    const creditLineItems = parsed.data.lineItems
      ? parsed.data.lineItems.map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          total: String(item.quantity * item.unitPrice),
          sortOrder: idx + 1,
        }))
      : invoice.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          total: String(item.total),
          sortOrder: item.sortOrder,
        }))

    const subtotal = creditLineItems.reduce((sum, item) => sum + parseFloat(item.total), 0)
    const taxRate = parseFloat(String(invoice.taxRate))
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const fatturaPAParams = {
      invoice: {
        number: invoice.number,
        issuedDate: new Date().toISOString(),
        dueDate: null,
        subtotal: String(subtotal),
        taxRate: String(invoice.taxRate),
        taxAmount: String(taxAmount),
        total: String(total),
        discount: '0',
        notes: parsed.data.reason,
      },
      client: {
        companyName: invoice.client.companyName,
        vatNumber: invoice.client.vatNumber,
        fiscalCode: invoice.client.fiscalCode,
        pec: invoice.client.pec,
        sdi: invoice.client.sdi,
      },
      company: {
        ragioneSociale: company.ragioneSociale,
        partitaIva: company.partitaIva,
        codiceFiscale: company.codiceFiscale,
        indirizzo: company.indirizzo,
        cap: company.cap,
        citta: company.citta,
        provincia: company.provincia,
        nazione: company.nazione,
        regimeFiscale: company.regimeFiscale,
        iban: company.iban,
        pec: company.pec,
        telefono: company.telefono,
        email: company.email,
      },
      lineItems: creditLineItems,
      tipoDocumento: 'TD04' as const,
      originalInvoiceRef: invoice.number,
    }

    const errors = validateFatturaPA(fatturaPAParams)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: 'Validazione fallita', details: errors }, { status: 400 })
    }

    const xmlContent = generateFatturaPA(fatturaPAParams)
    const eInvoiceCount = await prisma.electronicInvoice.count()
    const xmlFileName = generateXmlFileName(company.partitaIva, eInvoiceCount + 1)

    const eInvoice = await prisma.$transaction(async (tx) => {
      const eInvoice = await tx.electronicInvoice.create({
        data: {
          invoiceId,
          xmlContent,
          status: 'GENERATED',
          tipoDocumento: 'TD04',
          xmlFileName,
          generatedAt: new Date(),
          originalInvoiceRef: invoice.number,
          codiceDestinatario: invoice.client.sdi || '0000000',
          pecDestinatario: invoice.client.pec,
        },
      })

      await tx.eInvoiceStatusLog.create({
        data: {
          electronicInvoiceId: eInvoice.id,
          fromStatus: 'NEW',
          toStatus: 'GENERATED',
          note: `Nota di credito TD04 per fattura ${invoice.number}: ${parsed.data.reason}`,
          performedBy: request.headers.get('x-user-id') || undefined,
        },
      })

      return eInvoice
    })

    return NextResponse.json({ success: true, data: eInvoice }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[erp/invoices/:invoiceId/credit-note]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
