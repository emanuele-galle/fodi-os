import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { CONTRACT_TEMPLATES } from '@/lib/contract-templates'
import type { Role } from '@/generated/prisma/client'

// GET /api/contracts/templates - List all contract templates
export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const category = request.nextUrl.searchParams.get('category')

    let templates = CONTRACT_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      clauseCount: t.clauses.length,
    }))

    if (category) {
      templates = templates.filter((t) => t.category === category)
    }

    return NextResponse.json({ items: templates, total: templates.length })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    console.error('[contracts/templates]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
