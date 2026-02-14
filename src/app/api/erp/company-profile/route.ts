import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'

const companyProfileSchema = z.object({
  ragioneSociale: z.string().min(1, 'Ragione sociale obbligatoria').max(255),
  partitaIva: z.string().min(11).max(16),
  codiceFiscale: z.string().max(16).optional().nullable(),
  indirizzo: z.string().min(1, 'Indirizzo obbligatorio').max(255),
  cap: z.string().min(4).max(10),
  citta: z.string().min(1, 'Citta obbligatoria').max(100),
  provincia: z.string().min(1, 'Provincia obbligatoria').max(100),
  nazione: z.string().max(10).optional(),
  regimeFiscale: z.string().max(10).optional(),
  iban: z.string().max(34).optional().nullable(),
  pec: z.string().email('PEC non valida').max(255).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  email: z.string().email('Email non valida').max(255).optional().nullable(),
})

// GET /api/erp/company-profile - Get company profile
export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const profile = await prisma.companyProfile.findFirst()
    if (!profile) {
      return NextResponse.json(null)
    }
    return NextResponse.json(profile)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[erp/company-profile]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

// POST /api/erp/company-profile - Create or update company profile
export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = companyProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      ragioneSociale, partitaIva, codiceFiscale, indirizzo,
      cap, citta, provincia, nazione, regimeFiscale, iban,
      pec, telefono, email,
    } = parsed.data

    const existing = await prisma.companyProfile.findFirst()

    const data = {
      ragioneSociale,
      partitaIva,
      codiceFiscale: codiceFiscale || null,
      indirizzo,
      cap,
      citta,
      provincia,
      nazione: nazione || 'IT',
      regimeFiscale: regimeFiscale || 'RF01',
      iban: iban || null,
      pec: pec || null,
      telefono: telefono || null,
      email: email || null,
    }

    let profile
    if (existing) {
      profile = await prisma.companyProfile.update({
        where: { id: existing.id },
        data,
      })
    } else {
      profile = await prisma.companyProfile.create({ data })
    }

    return NextResponse.json(profile, { status: existing ? 200 : 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[erp/company-profile]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
