import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/erp/company-profile - Create or update company profile
export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const {
      ragioneSociale, partitaIva, codiceFiscale, indirizzo,
      cap, citta, provincia, nazione, regimeFiscale, iban,
      pec, telefono, email,
    } = body

    if (!ragioneSociale || !partitaIva || !indirizzo || !cap || !citta || !provincia) {
      return NextResponse.json(
        { error: 'Campi obbligatori: ragioneSociale, partitaIva, indirizzo, cap, citta, provincia' },
        { status: 400 }
      )
    }

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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
