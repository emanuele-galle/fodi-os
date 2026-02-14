import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { generateDocumentPdf, fetchLogoBytes } from '@/lib/pdf-generator'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: { select: { id: true, companyName: true, vatNumber: true, fiscalCode: true, pec: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Fattura non trovata' }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()
    if (!company) {
      return NextResponse.json({ success: false, error: 'Profilo azienda non configurato' }, { status: 400 })
    }

    // Fetch logo
    let logoBytes: Uint8Array | null = null
    let logoMimeType = 'image/png'
    if (company.logoUrl) {
      const logo = await fetchLogoBytes(company.logoUrl)
      if (logo) {
        logoBytes = logo.bytes
        logoMimeType = logo.mime
      }
    }

    const pdfBytes = await generateDocumentPdf({
      documentType: 'FATTURA',
      number: invoice.number,
      title: invoice.title,
      date: invoice.issuedDate
        ? new Date(invoice.issuedDate).toLocaleDateString('it-IT')
        : new Date(invoice.createdAt).toLocaleDateString('it-IT'),
      logoBytes,
      logoMimeType,
      company: {
        ragioneSociale: company.ragioneSociale,
        partitaIva: company.partitaIva,
        codiceFiscale: company.codiceFiscale,
        indirizzo: company.indirizzo,
        cap: company.cap,
        citta: company.citta,
        provincia: company.provincia,
        pec: company.pec,
        telefono: company.telefono,
        email: company.email,
        iban: company.iban,
        siteUrl: company.siteUrl,
      },
      client: {
        companyName: invoice.client.companyName,
        vatNumber: invoice.client.vatNumber,
        fiscalCode: invoice.client.fiscalCode,
        pec: invoice.client.pec,
      },
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        total: String(item.total),
      })),
      subtotal: String(invoice.subtotal),
      discount: String(invoice.discount),
      taxRate: String(invoice.taxRate),
      taxAmount: String(invoice.taxAmount),
      total: String(invoice.total),
      notes: invoice.notes,
      paymentTerms: invoice.paymentMethod || undefined,
      paymentInfo: {
        iban: company.iban || undefined,
        method: invoice.paymentMethod || undefined,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('it-IT') : undefined,
      },
      primaryColor: '#3B82F6',
      secondaryColor: '#1E293B',
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.number.replace(/\//g, '-')}.pdf"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[invoices/:invoiceId/pdf]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
