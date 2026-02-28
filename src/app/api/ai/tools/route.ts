import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { getToolsForRole } from '@/lib/ai/tools/registry'

export async function GET(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const tools = getToolsForRole(auth.role)

    const toolList = tools.map((t) => ({
      name: t.name,
      description: t.description,
      module: t.module,
      requiredPermission: t.requiredPermission,
    }))

    return NextResponse.json({ success: true, data: toolList })
  } catch (err) {
    console.error('[ai/tools/GET]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
