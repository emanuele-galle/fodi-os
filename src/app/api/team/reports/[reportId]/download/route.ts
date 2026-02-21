import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const userId = request.headers.get('x-user-id')!
  const role = request.headers.get('x-user-role') as Role

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportId } = await params

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { userId: true, pdfUrl: true, date: true, user: { select: { firstName: true, lastName: true } } },
  })

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Non-admin can only download their own reports
  const isAdmin = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM'].includes(role)
  if (!isAdmin && report.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Redirect to the S3/MinIO URL
  return NextResponse.json({ url: report.pdfUrl })
}
