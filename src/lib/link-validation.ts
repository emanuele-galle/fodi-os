/**
 * Validates external URLs for link attachments.
 * Includes SSRF protection: blocks private IPs, localhost, and non-HTTPS.
 */

const PROVIDER_PATTERNS: [RegExp, string][] = [
  [/drive\.google\.com|docs\.google\.com/, 'google_drive'],
  [/dropbox\.com/, 'dropbox'],
  [/wetransfer\.com|we\.tl/, 'wetransfer'],
  [/onedrive\.live\.com|1drv\.ms/, 'onedrive'],
  [/sharepoint\.com/, 'sharepoint'],
]

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
  '169.254.169.254',
])

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
]

export interface LinkValidationResult {
  valid: boolean
  provider: string
  error?: string
}

export function validateExternalLink(url: string): LinkValidationResult {
  // Must be a string
  if (!url || typeof url !== 'string') {
    return { valid: false, provider: 'unknown', error: 'URL obbligatorio' }
  }

  // Must be HTTPS
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, provider: 'unknown', error: 'URL non valido' }
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, provider: 'unknown', error: 'Solo link HTTPS sono accettati' }
  }

  // Block data: URIs embedded in URL
  if (url.toLowerCase().startsWith('data:')) {
    return { valid: false, provider: 'unknown', error: 'URL non valido' }
  }

  // SSRF: block localhost and reserved hostnames
  const hostname = parsed.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, provider: 'unknown', error: 'URL non consentito' }
  }

  // SSRF: block private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return { valid: false, provider: 'unknown', error: 'URL non consentito' }
    }
  }

  // Detect provider
  let provider = 'other'
  for (const [pattern, name] of PROVIDER_PATTERNS) {
    if (pattern.test(hostname)) {
      provider = name
      break
    }
  }

  return { valid: true, provider }
}
