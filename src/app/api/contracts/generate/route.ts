import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { z } from 'zod'
import { getContractTemplate } from '@/lib/contract-templates'
import { generateContractPdf } from '@/lib/contract-pdf-generator'
import { uploadFile } from '@/lib/s3'
import type { Role } from '@/generated/prisma/client'

const generateSchema = z.object({
  templateId: z.string().min(1, 'Template obbligatorio'),
  clientId: z.string().uuid('ID cliente non valido'),
  contractNumber: z.string().optional(),
  city: z.string().default('Serra San Bruno'),
  date: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
})

// POST /api/contracts/generate - Generate a contract PDF
export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { templateId, clientId, city, customFields, primaryColor, secondaryColor } = parsed.data

    // Get template
    const template = getContractTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template contratto non trovato' }, { status: 404 })
    }

    // Get client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
      },
    })
    if (!client) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
    }

    // Get company profile
    const companyProfile = await prisma.companyProfile.findFirst()
    if (!companyProfile) {
      return NextResponse.json({ error: 'Profilo aziendale non configurato. Configuralo da ERP > Impostazioni.' }, { status: 400 })
    }

    // Generate contract number
    const year = new Date().getFullYear()
    const existingCount = await prisma.signatureRequest.count({
      where: {
        documentType: 'CONTRACT',
        createdAt: { gte: new Date(`${year}-01-01`) },
      },
    })
    const contractNumber = parsed.data.contractNumber || `CTR-${year}-${String(existingCount + 1).padStart(3, '0')}`

    // Format date
    const dateStr = parsed.data.date || new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    // Primary contact
    const primaryContact = client.contacts[0]

    // Generate PDF
    const pdfBytes = await generateContractPdf({
      template,
      contractNumber,
      date: dateStr,
      city,
      company: {
        ragioneSociale: companyProfile.ragioneSociale,
        partitaIva: companyProfile.partitaIva,
        codiceFiscale: companyProfile.codiceFiscale,
        indirizzo: companyProfile.indirizzo,
        cap: companyProfile.cap,
        citta: companyProfile.citta,
        provincia: companyProfile.provincia,
        pec: companyProfile.pec,
        telefono: companyProfile.telefono,
        email: companyProfile.email,
        iban: companyProfile.iban,
      },
      client: {
        companyName: client.companyName,
        legalRepresentative: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : null,
        vatNumber: client.vatNumber,
        fiscalCode: client.fiscalCode,
        address: null,
        pec: client.pec,
        email: primaryContact?.email || null,
        phone: primaryContact?.phone || null,
      },
      customFields: customFields as Record<string, string> | undefined,
      logoUrl: '/logo-official.png',
      primaryColor: primaryColor || '#1a1a2e',
      secondaryColor: secondaryColor || '#16213e',
    })

    // Upload to S3/MinIO
    const fileName = `contracts/${contractNumber.replace(/\//g, '-')}.pdf`
    const pdfUrl = await uploadFile(fileName, Buffer.from(pdfBytes), 'application/pdf')

    return NextResponse.json({
      success: true,
      contractNumber,
      templateName: template.name,
      clientName: client.companyName,
      pdfUrl,
      fileName,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    console.error('[contracts/generate]', e)
    return NextResponse.json({ error: 'Errore nella generazione del contratto' }, { status: 500 })
  }
}
