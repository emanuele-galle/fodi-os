import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { generateDocumentPdf, fetchLogoBytes } from '@/lib/pdf-generator'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { quoteId } = await params

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: { select: { id: true, companyName: true, vatNumber: true, fiscalCode: true, pec: true } },
        template: { select: { primaryColor: true, secondaryColor: true, termsAndConditions: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()
    if (!company) {
      return NextResponse.json({ error: 'Profilo azienda non configurato' }, { status: 400 })
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
      documentType: 'PREVENTIVO',
      number: quote.number,
      title: quote.title,
      date: new Date(quote.createdAt).toLocaleDateString('it-IT'),
      validUntil: quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('it-IT') : null,
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
        companyName: quote.client.companyName,
        vatNumber: quote.client.vatNumber,
        fiscalCode: quote.client.fiscalCode,
        pec: quote.client.pec,
      },
      lineItems: quote.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        total: String(item.total),
      })),
      subtotal: String(quote.subtotal),
      discount: String(quote.discount),
      taxRate: String(quote.taxRate),
      taxAmount: String(quote.taxAmount),
      total: String(quote.total),
      notes: quote.notes,
      termsAndConditions: quote.template?.termsAndConditions,
      primaryColor: quote.template?.primaryColor || '#3B82F6',
      secondaryColor: quote.template?.secondaryColor || '#1E293B',
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.number}.pdf"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
