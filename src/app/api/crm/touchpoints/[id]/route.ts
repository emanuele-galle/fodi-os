import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Role, Prisma } from '@/generated/prisma/client'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.triggerType !== undefined) data.triggerType = body.triggerType
    if (body.triggerConfig !== undefined) data.triggerConfig = body.triggerConfig as Prisma.InputJsonValue
    if (body.actionType !== undefined) data.actionType = body.actionType
    if (body.actionConfig !== undefined) data.actionConfig = body.actionConfig as Prisma.InputJsonValue
    if (body.isActive !== undefined) data.isActive = body.isActive

    const rule = await prisma.touchpointRule.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: rule })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { id } = await params
    await prisma.touchpointRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore' }, { status: 500 })
  }
}
