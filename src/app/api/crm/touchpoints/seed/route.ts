import { NextRequest, NextResponse } from 'next/server'
import { brand } from '@/lib/branding'
import { seedDefaultRules } from '@/lib/crm/touchpoint-engine'

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role')
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const count = await seedDefaultRules(brand.slug)
    return NextResponse.json({ success: true, created: count })
  } catch (e) {
    console.error('[touchpoints/seed]', e)
    return NextResponse.json({ error: 'Errore nel seed' }, { status: 500 })
  }
}
