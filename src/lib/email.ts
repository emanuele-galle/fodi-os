import { brand } from '@/lib/branding'
import { randomInt } from 'crypto'
import { buildLoginOtpEmail } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || brand.email.from

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Singleton transporter ─────────────────────────────────

let _transporter: { sendMail: (opts: Record<string, unknown>) => Promise<unknown> } | null = null

function getTransporter() {
  if (_transporter) return _transporter
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer')
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return _transporter
}

// ─── Public API ────────────────────────────────────────────

interface EmailAttachment {
  name: string
  content: Buffer
  contentType?: string
}

export async function sendViaSMTP(
  to: string,
  subject: string,
  html: string,
  text?: string,
  options?: { attachments?: EmailAttachment[] }
): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) {
    logger.info('[EMAIL] SMTP non configurato, email simulata', { to, subject, bodyPreview: html.substring(0, 200) })
    return true
  }

  try {
    const mailOpts: Record<string, unknown> = {
      from: SMTP_FROM,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    }
    if (options?.attachments?.length) {
      mailOpts.attachments = options.attachments.map(a => ({
        filename: a.name,
        content: a.content,
        contentType: a.contentType || 'application/pdf',
      }))
    }
    await transporter.sendMail(mailOpts)
    return true
  } catch (err) {
    logger.error('[EMAIL] Errore invio email', { error: err instanceof Error ? err.message : String(err) })
    return false
  }
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999))
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

export async function sendLoginOtpEmail(to: string, otpCode: string, ipAddress: string): Promise<boolean> {
  const subject = `Codice di verifica - ${brand.name}`
  const html = buildLoginOtpEmail({ otpCode, ipAddress })
  return sendViaSMTP(to, subject, html)
}
