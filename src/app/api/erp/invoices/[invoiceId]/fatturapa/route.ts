import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { generateFatturaPA, validateFatturaPA, generateXmlFileName } from '@/lib/fatturapa'
import type { Role } from '@/generated/prisma/client'

// GET /api/erp/invoices/[invoiceId]/fatturapa - Get electronic invoice data
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
      return NextResponse.json(null)
    }

    return NextResponse.json(eInvoice)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/erp/invoices/[invoiceId]/fatturapa - Generate FatturaPA XML
export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { invoiceId } = await params

    // Fetch invoice with client and line items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
    }

    // Fetch company profile
    const company = await prisma.companyProfile.findFirst()
    if (!company) {
      return NextResponse.json(
        { error: 'Profilo azienda non configurato. Vai in Impostazioni > Fatturazione.' },
        { status: 400 }
      )
    }

    // Parse optional body for tipoDocumento
    let tipoDocumento: 'TD01' | 'TD04' | 'TD05' | 'TD24' = 'TD01'
    try {
      const body = await request.json()
      if (body.tipoDocumento) tipoDocumento = body.tipoDocumento
    } catch {
      // No body or invalid JSON - use default
    }

    const fatturaPAParams = {
      invoice: {
        number: invoice.number,
        issuedDate: invoice.issuedDate?.toISOString() ?? null,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        subtotal: String(invoice.subtotal),
        taxRate: String(invoice.taxRate),
        taxAmount: String(invoice.taxAmount),
        total: String(invoice.total),
        discount: String(invoice.discount),
        notes: invoice.notes,
        paymentMethod: invoice.paymentMethod,
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
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        total: String(item.total),
        sortOrder: item.sortOrder,
      })),
      tipoDocumento,
    }

    // Validate
    const errors = validateFatturaPA(fatturaPAParams)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validazione fallita', details: errors }, { status: 400 })
    }

    // Generate XML
    const xmlContent = generateFatturaPA(fatturaPAParams)

    // Count existing e-invoices for this company to generate progressive filename
    const eInvoiceCount = await prisma.electronicInvoice.count()
    const xmlFileName = generateXmlFileName(company.partitaIva, eInvoiceCount + 1)

    // Save or update electronic invoice
    const existing = await prisma.electronicInvoice.findFirst({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })

    const eInvoice = await prisma.$transaction(async (tx) => {
      let eInvoice
      if (existing && existing.status === 'DRAFT') {
        eInvoice = await tx.electronicInvoice.update({
          where: { id: existing.id },
          data: {
            xmlContent,
            status: 'GENERATED',
            tipoDocumento,
            xmlFileName,
            generatedAt: new Date(),
            codiceDestinatario: invoice.client.sdi || '0000000',
            pecDestinatario: invoice.client.pec,
          },
        })
      } else {
        eInvoice = await tx.electronicInvoice.create({
          data: {
            invoiceId,
            xmlContent,
            status: 'GENERATED',
            tipoDocumento,
            xmlFileName,
            generatedAt: new Date(),
            codiceDestinatario: invoice.client.sdi || '0000000',
            pecDestinatario: invoice.client.pec,
          },
        })
      }

      await tx.eInvoiceStatusLog.create({
        data: {
          electronicInvoiceId: eInvoice.id,
          fromStatus: existing?.status || 'NEW',
          toStatus: 'GENERATED',
          note: `XML generato (${tipoDocumento})`,
        },
      })

      return eInvoice
    })

    return NextResponse.json(eInvoice, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
