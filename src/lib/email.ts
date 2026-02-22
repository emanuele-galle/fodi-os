import { brand } from '@/lib/branding'
import { randomInt } from 'crypto'

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

export async function sendViaSMTP(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('[EMAIL] SMTP non configurato, email simulata:')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body: ${html.substring(0, 200)}...`)
    return true
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer') as { createTransport: (opts: Record<string, unknown>) => { sendMail: (opts: Record<string, string>) => Promise<void> } }
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    })
    return true
  } catch (err) {
    console.error('[EMAIL] Errore invio email:', err)
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

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1e293b; margin: 0 0 8px;">Nuovo accesso rilevato</h2>
    <p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">
      È stato rilevato un tentativo di accesso al tuo account da un indirizzo IP non riconosciuto:
    </p>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
      <p style="color: #92400e; font-size: 13px; margin: 0;">
        <strong>IP:</strong> ${ipAddress}
      </p>
    </div>
    <p style="color: #64748b; margin: 0 0 16px; font-size: 14px;">
      Inserisci il seguente codice per confermare la tua identità:
    </p>
    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${otpCode}</span>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 16px;">
      Il codice scade tra <strong>10 minuti</strong>. Non condividerlo con nessuno.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #ef4444; font-size: 12px; margin: 0 0 8px;">
      <strong>⚠️ Se non sei stato tu</strong>, cambia immediatamente la tua password e contatta l'amministratore.
    </p>
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
      ${brand.email.footerText} - Sistema Gestionale<br/>
      Questa è un'email automatica, non rispondere.
    </p>
  </div>
</body>
</html>`

  return sendViaSMTP(to, subject, html)
}
