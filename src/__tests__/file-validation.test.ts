import { describe, it, expect, vi } from 'vitest'

// Set env before importing
vi.stubEnv('MAX_FILE_SIZE_MB', '100')

const { validateFile } = await import('@/lib/file-validation')

const MIME_PDF = 'application/pdf'
const MIME_TEXT = 'text/plain'

describe('File Validation - validateFile', () => {
  describe('file size checks', () => {
    it('accepts file within default size limit', () => {
      const result = validateFile('doc.pdf', 50 * 1024 * 1024, MIME_PDF)
      expect(result).toBeNull()
    })

    it('rejects file exceeding default size limit', () => {
      const result = validateFile('big.pdf', 101 * 1024 * 1024, MIME_PDF)
      expect(result).not.toBeNull()
      expect(result!.code).toBe('FILE_TOO_LARGE')
      expect(result!.message).toContain('100 MB')
    })

    it('respects custom maxSizeBytes option', () => {
      const fiveMB = 5 * 1024 * 1024
      const result = validateFile('doc.pdf', 6 * 1024 * 1024, MIME_PDF, undefined, {
        maxSizeBytes: fiveMB,
      })
      expect(result).not.toBeNull()
      expect(result!.code).toBe('FILE_TOO_LARGE')
      expect(result!.message).toContain('5 MB')
    })

    it('accepts file exactly at the size limit', () => {
      const maxSize = 10 * 1024 * 1024
      const result = validateFile('doc.pdf', maxSize, MIME_PDF, undefined, {
        maxSizeBytes: maxSize,
      })
      expect(result).toBeNull()
    })
  })

  describe('blocked extensions', () => {
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.scr', '.pif', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh']

    for (const ext of blockedExtensions) {
      it(`blocks ${ext} files`, () => {
        const result = validateFile(`malware${ext}`, 1024, 'application/octet-stream')
        expect(result).not.toBeNull()
        expect(result!.code).toBe('BLOCKED_EXTENSION')
        expect(result!.message).toContain(ext)
      })
    }

    it('allows safe extensions like .pdf', () => {
      const result = validateFile('document.pdf', 1024, MIME_PDF)
      expect(result).toBeNull()
    })

    it('allows .png files', () => {
      const result = validateFile('image.png', 1024, 'image/png')
      expect(result).toBeNull()
    })

    it('handles case-insensitive extensions', () => {
      const result = validateFile('malware.EXE', 1024, 'application/octet-stream')
      expect(result).not.toBeNull()
      expect(result!.code).toBe('BLOCKED_EXTENSION')
    })

    it('allows files without extension', () => {
      const result = validateFile('README', 1024, MIME_TEXT)
      expect(result).toBeNull()
    })
  })

  describe('allowed MIME types', () => {
    it('accepts file when MIME is in allowed list', () => {
      const result = validateFile('doc.pdf', 1024, MIME_PDF, undefined, {
        allowedMimeTypes: [MIME_PDF, 'image/png'],
      })
      expect(result).toBeNull()
    })

    it('rejects file when MIME is not in allowed list', () => {
      const result = validateFile('doc.txt', 1024, MIME_TEXT, undefined, {
        allowedMimeTypes: [MIME_PDF, 'image/png'],
      })
      expect(result).not.toBeNull()
      expect(result!.code).toBe('INVALID_MIME')
      expect(result!.message).toContain(MIME_TEXT)
    })

    it('skips MIME check when no allowedMimeTypes specified', () => {
      const result = validateFile('anything.txt', 1024, MIME_TEXT)
      expect(result).toBeNull()
    })
  })

  describe('magic bytes verification', () => {
    it('accepts PDF with correct magic bytes', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
      const result = validateFile('doc.pdf', pdfBuffer.length, MIME_PDF, pdfBuffer)
      expect(result).toBeNull()
    })

    it('rejects PDF with wrong magic bytes', () => {
      const fakeBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
      const result = validateFile('fake.pdf', fakeBuffer.length, MIME_PDF, fakeBuffer)
      expect(result).not.toBeNull()
      expect(result!.code).toBe('MIME_MISMATCH')
    })

    it('accepts PNG with correct magic bytes', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const result = validateFile('image.png', pngBuffer.length, 'image/png', pngBuffer)
      expect(result).toBeNull()
    })

    it('accepts JPEG with correct magic bytes', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00])
      const result = validateFile('photo.jpg', jpegBuffer.length, 'image/jpeg', jpegBuffer)
      expect(result).toBeNull()
    })

    it('skips magic check for unknown MIME types', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00])
      const result = validateFile('data.csv', buffer.length, 'text/csv', buffer)
      expect(result).toBeNull()
    })

    it('skips magic check when buffer is too short', () => {
      const tinyBuffer = Buffer.from([0x00, 0x00])
      const result = validateFile('doc.pdf', tinyBuffer.length, MIME_PDF, tinyBuffer)
      expect(result).toBeNull()
    })

    it('skips magic check when no buffer provided', () => {
      const result = validateFile('doc.pdf', 1024, MIME_PDF)
      expect(result).toBeNull()
    })
  })

  describe('validation order: size → extension → MIME → magic', () => {
    it('reports size error before extension error', () => {
      const result = validateFile('malware.exe', 200 * 1024 * 1024, 'application/octet-stream')
      expect(result!.code).toBe('FILE_TOO_LARGE')
    })

    it('reports extension error before MIME error', () => {
      const result = validateFile('bad.exe', 1024, MIME_TEXT, undefined, {
        allowedMimeTypes: [MIME_PDF],
      })
      expect(result!.code).toBe('BLOCKED_EXTENSION')
    })
  })
})
