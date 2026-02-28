/**
 * One-shot migration script: MinIO → Cloudflare R2
 *
 * Usage:
 *   npx tsx scripts/migrate-minio-to-r2.ts [--dry-run]
 *
 * Requires env vars: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET,
 *   R2_ACCOUNT_ID, R2_API_TOKEN, R2_BUCKET, R2_PUBLIC_URL, DATABASE_URL
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const DRY_RUN = process.argv.includes('--dry-run')

// MinIO client
const minio = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const minioBucket = process.env.S3_BUCKET!
const r2AccountId = process.env.R2_ACCOUNT_ID!
const r2Bucket = process.env.R2_BUCKET!
const r2Token = process.env.R2_API_TOKEN!
const r2PublicUrl = process.env.R2_PUBLIC_URL!
const s3PublicUrl = process.env.S3_PUBLIC_URL!

const R2_BASE = `https://api.cloudflare.com/client/v4/accounts/${r2AccountId}/r2/buckets/${r2Bucket}/objects`

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function r2Upload(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const res = await fetch(`${R2_BASE}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${r2Token}`,
      'Content-Type': contentType,
    },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`R2 upload failed (${res.status}): ${text}`)
  }
}

async function streamToBuffer(stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  // Handle Node.js readable stream from AWS SDK
  const nodeStream = stream as NodeJS.ReadableStream
  return new Promise((resolve, reject) => {
    nodeStream.on('data', (chunk: Buffer) => chunks.push(chunk))
    nodeStream.on('end', () => resolve(Buffer.concat(chunks)))
    nodeStream.on('error', reject)
  })
}

async function listAllObjects(): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: minioBucket,
      ContinuationToken: continuationToken,
    })
    const res = await minio.send(cmd)
    for (const obj of res.Contents || []) {
      if (obj.Key) keys.push(obj.Key)
    }
    continuationToken = res.NextContinuationToken
  } while (continuationToken)

  return keys
}

async function migrateFiles() {
  console.log(`\n📦 Listing objects in MinIO bucket "${minioBucket}"...`)
  const keys = await listAllObjects()
  console.log(`   Found ${keys.length} objects\n`)

  let migrated = 0
  let failed = 0
  let skipped = 0

  for (const key of keys) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would migrate: ${key}`)
        skipped++
        continue
      }

      // Download from MinIO
      const getCmd = new GetObjectCommand({ Bucket: minioBucket, Key: key })
      const getRes = await minio.send(getCmd)
      if (!getRes.Body) {
        console.warn(`  ⚠️  Empty body for key: ${key}`)
        skipped++
        continue
      }

      const buffer = await streamToBuffer(getRes.Body as NodeJS.ReadableStream)
      const contentType = getRes.ContentType || 'application/octet-stream'

      // Upload to R2
      await r2Upload(key, buffer, contentType)
      migrated++
      console.log(`  ✅ ${key} (${(buffer.length / 1024).toFixed(0)} KB)`)
    } catch (err) {
      failed++
      console.error(`  ❌ ${key}: ${(err as Error).message}`)
    }
  }

  console.log(`\n📊 Migration summary: ${migrated} migrated, ${failed} failed, ${skipped} skipped`)
  return migrated
}

async function updateDatabaseUrls() {
  const oldPrefix = `${s3PublicUrl}/${minioBucket}/`
  const newPrefix = `${r2PublicUrl}/`

  console.log(`\n🔄 Updating database URLs...`)
  console.log(`   Old pattern: ${oldPrefix}*`)
  console.log(`   New pattern: ${newPrefix}*\n`)

  if (DRY_RUN) {
    // Count affected rows
    const paCount = await prisma.projectAttachment.count({ where: { fileUrl: { startsWith: oldPrefix } } })
    const taCount = await prisma.taskAttachment.count({ where: { fileUrl: { startsWith: oldPrefix } } })
    const docCount = await prisma.document.count({ where: { fileUrl: { startsWith: oldPrefix } } })
    console.log(`  [DRY-RUN] Would update: ${paCount} project attachments, ${taCount} task attachments, ${docCount} documents`)
    return
  }

  // Update project_attachments
  const paResult = await prisma.$executeRawUnsafe(
    `UPDATE project_attachments SET "fileUrl" = REPLACE("fileUrl", $1, $2) WHERE "fileUrl" LIKE $3`,
    oldPrefix, newPrefix, `${oldPrefix}%`
  )
  console.log(`  ✅ project_attachments: ${paResult} rows updated`)

  // Update task_attachments
  const taResult = await prisma.$executeRawUnsafe(
    `UPDATE task_attachments SET "fileUrl" = REPLACE("fileUrl", $1, $2) WHERE "fileUrl" LIKE $3`,
    oldPrefix, newPrefix, `${oldPrefix}%`
  )
  console.log(`  ✅ task_attachments: ${taResult} rows updated`)

  // Update documents
  const docResult = await prisma.$executeRawUnsafe(
    `UPDATE documents SET "fileUrl" = REPLACE("fileUrl", $1, $2) WHERE "fileUrl" LIKE $3`,
    oldPrefix, newPrefix, `${oldPrefix}%`
  )
  console.log(`  ✅ documents: ${docResult} rows updated`)

  // Update chat_messages metadata (JSON field)
  const chatResult = await prisma.$executeRawUnsafe(
    `UPDATE chat_messages SET metadata = jsonb_set(metadata, '{fileUrl}', to_jsonb(REPLACE(metadata->>'fileUrl', $1, $2)))
     WHERE type = 'FILE_LINK' AND metadata->>'fileUrl' LIKE $3`,
    oldPrefix, newPrefix, `${oldPrefix}%`
  )
  console.log(`  ✅ chat_messages: ${chatResult} rows updated`)
}

async function main() {
  console.log('🚀 MinIO → R2 Migration')
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   MinIO: ${process.env.S3_ENDPOINT}/${minioBucket}`)
  console.log(`   R2: ${r2PublicUrl} (bucket: ${r2Bucket})`)

  // Phase 1: Migrate files
  await migrateFiles()

  // Phase 2: Update database URLs
  await updateDatabaseUrls()

  console.log('\n✨ Migration complete!')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err)
  prisma.$disconnect()
  process.exit(1)
})
