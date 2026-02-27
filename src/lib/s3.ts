import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// MinIO — Local VPS storage (always configured)
//   Accessible by Claude Code and local tools via s3.fodivps1.cloud / mc CLI.
//   Acts as primary when R2 is not configured, local backup when R2 is active.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Cloudflare R2 — Primary CDN storage (optional, enabled via R2_ACCOUNT_ID)
//   Uses Cloudflare REST API (no S3 credentials needed, just an API token).
//   Zero egress fees, global edge caching, custom domain.
//   Each OS instance gets its own R2 bucket for autonomy.
// ---------------------------------------------------------------------------
const r2AccountId = process.env.R2_ACCOUNT_ID || ''
const r2Bucket = process.env.R2_BUCKET || ''
const r2Token = process.env.R2_API_TOKEN || ''
const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
const r2Active = !!(r2AccountId && r2Bucket && r2Token)

const R2_BASE = `https://api.cloudflare.com/client/v4/accounts/${r2AccountId}/r2/buckets/${r2Bucket}/objects`

/**
 * Whether Cloudflare R2 is configured and active.
 */
export function isR2Active(): boolean {
  return r2Active
}

/**
 * Upload file to R2 via Cloudflare REST API.
 */
async function r2Upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  const res = await fetch(`${R2_BASE}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${r2Token}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`R2 upload failed (${res.status}): ${text}`)
  }
}

/**
 * Delete file from R2 via Cloudflare REST API.
 */
async function r2Delete(key: string): Promise<void> {
  const res = await fetch(`${R2_BASE}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${r2Token}` },
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`R2 delete failed (${res.status}): ${text}`)
  }
}

/**
 * Upload a file to storage.
 *
 * When R2 is configured:
 *   1. Uploads to Cloudflare R2 (primary — serves the public URL)
 *   2. Copies to MinIO local (best-effort background — for Claude Code / dev access)
 *
 * When R2 is NOT configured (dev / fallback):
 *   1. Uploads to MinIO only
 *
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  if (r2Active) {
    // R2 primary upload
    await r2Upload(key, body, contentType)

    // MinIO local backup (fire-and-forget, non-blocking)
    minio
      .send(
        new PutObjectCommand({
          Bucket: minioBucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      )
      .catch((err) =>
        logger.warn('[storage] MinIO local backup failed', { error: (err as Error).message }),
      )

    return `${r2PublicUrl}/${key}`
  }

  // Fallback: MinIO only
  await minio.send(
    new PutObjectCommand({
      Bucket: minioBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  const publicBase = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT!
  return `${publicBase}/${minioBucket}/${key}`
}

/**
 * Delete a file from all configured backends (best-effort).
 */
export async function deleteFile(key: string): Promise<void> {
  const promises: Promise<void>[] = []

  // Delete from MinIO
  promises.push(
    minio
      .send(new DeleteObjectCommand({ Bucket: minioBucket, Key: key }))
      .then(() => {})
      .catch((err) =>
        logger.warn('[storage] MinIO delete failed', { error: (err as Error).message }),
      ),
  )

  // Delete from R2
  if (r2Active) {
    promises.push(
      r2Delete(key).catch((err) =>
        logger.warn('[storage] R2 delete failed', { error: (err as Error).message }),
      ),
    )
  }

  await Promise.all(promises)
}

/**
 * Upload directly to MinIO only (bypasses R2).
 * Useful for internal/dev files that only need local VPS access.
 */
export async function uploadToMinioOnly(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await minio.send(
    new PutObjectCommand({
      Bucket: minioBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  const publicBase = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT!
  return `${publicBase}/${minioBucket}/${key}`
}
