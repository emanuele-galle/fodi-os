import { describe, it, expect } from 'vitest'
import { validateExternalLink } from '@/lib/link-validation'

const ERR_URL_NOT_ALLOWED = 'URL non consentito'

describe('Link Validation - validateExternalLink', () => {
  describe('basic validation', () => {
    it('accepts valid HTTPS URL', () => {
      const result = validateExternalLink('https://example.com/file.pdf')
      expect(result.valid).toBe(true)
    })

    it('rejects empty string', () => {
      const result = validateExternalLink('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL obbligatorio')
    })

    it('rejects invalid URL format', () => {
      const result = validateExternalLink('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL non valido')
    })

    it('rejects HTTP (non-HTTPS) URLs', () => {
      const result = validateExternalLink('http://example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('HTTPS')
    })

    it('rejects FTP URLs', () => {
      const result = validateExternalLink('ftp://files.example.com/data')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('HTTPS')
    })
  })

  describe('SSRF protection - blocked hostnames', () => {
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', 'metadata.google.internal', '169.254.169.254']

    for (const host of blockedHosts) {
      it(`blocks ${host}`, () => {
        const result = validateExternalLink(`https://${host}/secret`)
        expect(result.valid).toBe(false)
        expect(result.error).toBe(ERR_URL_NOT_ALLOWED)
      })
    }

    it('blocks .local domains', () => {
      const result = validateExternalLink('https://myserver.local/api')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ERR_URL_NOT_ALLOWED)
    })

    it('blocks .internal domains', () => {
      const result = validateExternalLink('https://service.internal/data')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ERR_URL_NOT_ALLOWED)
    })
  })

  describe('SSRF protection - private IP ranges', () => {
    it('blocks 10.x.x.x range', () => {
      const result = validateExternalLink('https://10.0.0.1/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ERR_URL_NOT_ALLOWED)
    })

    it('blocks 172.16-31.x.x range', () => {
      const result = validateExternalLink('https://172.16.0.1/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ERR_URL_NOT_ALLOWED)
    })

    it('blocks 192.168.x.x range', () => {
      const result = validateExternalLink('https://192.168.1.1/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ERR_URL_NOT_ALLOWED)
    })

    it('allows public IP addresses', () => {
      const result = validateExternalLink('https://8.8.8.8/dns')
      expect(result.valid).toBe(true)
    })
  })

  describe('provider detection', () => {
    it('detects Google Drive', () => {
      const result = validateExternalLink('https://drive.google.com/file/d/abc123/view')
      expect(result.valid).toBe(true)
      expect(result.provider).toBe('google_drive')
    })

    it('detects Google Docs', () => {
      const result = validateExternalLink('https://docs.google.com/document/d/abc123')
      expect(result.valid).toBe(true)
      expect(result.provider).toBe('google_drive')
    })

    it('detects Dropbox', () => {
      const result = validateExternalLink('https://dropbox.com/s/abc123/file.pdf')
      expect(result.valid).toBe(true)
      expect(result.provider).toBe('dropbox')
    })

    it('detects WeTransfer', () => {
      const result = validateExternalLink('https://wetransfer.com/downloads/abc123')
      expect(result.valid).toBe(true)
      expect(result.provider).toBe('wetransfer')
    })

    it('detects OneDrive', () => {
      const result = validateExternalLink('https://onedrive.live.com/abc')
      expect(result.valid).toBe(true)
      expect(result.provider).toBe('onedrive')
    })

    it('detects SharePoint', () => {
      const result = validateExternalLink('https://company.sharepoint.com/sites/docs')
      expect(result.valid).toBe(true)
      expect(result.provider).toBe('sharepoint')
    })

    it('returns "other" for unrecognized provider', () => {
      const result = validateExternalLink('https://example.com/file.pdf')
      expect(result.valid).toBe(true)
      expect(result.provider).toBe('other')
    })
  })
})
