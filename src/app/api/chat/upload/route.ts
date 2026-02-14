import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { uploadFile } from '@/lib/s3'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 50MB)' }, { status: 400 })
    }

    // Block dangerous file types
    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'jsp', 'cgi', 'html', 'htm', 'svg', 'msi', 'dll', 'scr', 'ps1']
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    if (blockedExts.includes(ext)) {
      return NextResponse.json({ error: 'Tipo di file non consentito' }, { status: 400 })
    }

    // Sanitize filename (remove path traversal and special characters)
    const safeName = file.name.replace(/[\/\\:*?"<>|]/g, '_').replace(/\.{2,}/g, '.')

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `chat/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const fileUrl = await uploadFile(key, buffer, file.type || 'application/octet-stream')

    return NextResponse.json({
      fileName: safeName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/upload]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
