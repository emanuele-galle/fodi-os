import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

const DEFAULT_VAT_RATES = [
  { rate: 22, label: '22% Ordinaria', code: '22', description: 'Aliquota IVA ordinaria', isDefault: true, sortOrder: 0 },
  { rate: 10, label: '10% Ridotta', code: '10', description: 'Aliquota ridotta (alimentari, ristrutturazioni, ecc.)', sortOrder: 1 },
  { rate: 5, label: '5% Ridottissima', code: '5', description: 'Aliquota ridottissima (erbe officinali, ecc.)', sortOrder: 2 },
  { rate: 4, label: '4% Minima', code: '4', description: 'Aliquota minima (beni di prima necessità)', sortOrder: 3 },
  { rate: 0, label: '0% Esente art.10', code: 'ESENTE', description: 'Operazioni esenti da IVA (art. 10 DPR 633/72)', sortOrder: 4 },
  { rate: 0, label: '0% Non Imponibile art.15', code: 'NI_ART15', description: 'Esclusioni dalla base imponibile (art. 15 DPR 633/72)', sortOrder: 5 },
  { rate: 0, label: '0% Reverse Charge', code: 'RC', description: 'Inversione contabile - IVA a carico del cessionario', sortOrder: 6 },
  { rate: 0, label: '0% Fuori Campo IVA', code: 'FC', description: 'Operazioni fuori campo IVA', sortOrder: 7 },
]

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    let created = 0
    for (const vr of DEFAULT_VAT_RATES) {
      const existing = await prisma.vatRate.findUnique({ where: { code: vr.code } })
      if (!existing) {
        await prisma.vatRate.create({ data: vr })
        created++
      }
    }

    return NextResponse.json({ success: true, created, message: `${created} aliquote create` })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[vat-rates-seed]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
