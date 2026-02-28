/**
 * File validation module for upload security.
 * Validates file size, extension blocklist, and magic bytes.
 */

const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10)) * 1024 * 1024 // default 100MB

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com',
  '.scr', '.pif', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh',
])

// Magic bytes for common file types
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }> = {
  'application/pdf': { bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  'image/png': { bytes: [0x89, 0x50, 0x4E, 0x47] },
  'image/jpeg': { bytes: [0xFF, 0xD8, 0xFF] },
  'image/gif': { bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  'image/webp': { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (check WEBP at offset 8)
  'application/zip': { bytes: [0x50, 0x4B, 0x03, 0x04] },
  'application/gzip': { bytes: [0x1F, 0x8B] },
}

interface FileValidationError {
  code: 'FILE_TOO_LARGE' | 'BLOCKED_EXTENSION' | 'INVALID_MIME' | 'MIME_MISMATCH'
  message: string
}

interface ValidateFileOptions {
  maxSizeBytes?: number
  allowedMimeTypes?: string[]
}

/**
 * Validate a file for upload security.
 * Returns null if valid, or a FileValidationError if invalid.
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string,
  buffer?: Buffer,
  options?: ValidateFileOptions
): FileValidationError | null {
  const maxSize = options?.maxSizeBytes ?? MAX_FILE_SIZE_BYTES

  // Check file size
  if (fileSize > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return {
      code: 'FILE_TOO_LARGE',
      message: `Il file supera la dimensione massima consentita (${maxMB} MB)`,
    }
  }

  // Check blocked extensions
  const ext = getExtension(fileName)
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      code: 'BLOCKED_EXTENSION',
      message: `Il tipo di file "${ext}" non è consentito per motivi di sicurezza`,
    }
  }

  // Check allowed MIME types (if specified)
  if (options?.allowedMimeTypes && !options.allowedMimeTypes.includes(mimeType)) {
    return {
      code: 'INVALID_MIME',
      message: `Il tipo di file "${mimeType}" non è supportato`,
    }
  }

  // Verify magic bytes vs declared MIME type (if buffer provided)
  if (buffer && buffer.length >= 4) {
    const magicCheck = MAGIC_BYTES[mimeType]
    if (magicCheck) {
      const offset = magicCheck.offset ?? 0
      const matches = magicCheck.bytes.every(
        (byte, i) => buffer[offset + i] === byte
      )
      if (!matches) {
        return {
          code: 'MIME_MISMATCH',
          message: `Il contenuto del file non corrisponde al tipo dichiarato (${mimeType})`,
        }
      }
    }
  }

  return null
}

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1) return ''
  return fileName.slice(lastDot).toLowerCase()
}
