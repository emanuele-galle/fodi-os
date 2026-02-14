const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@fodisrl.it'

async function sendViaSMTP(to: string, subject: string, html: string): Promise<boolean> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('[SIGNATURE-EMAIL] SMTP non configurato, email simulata:')
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
    })
    return true
  } catch (err) {
    console.error('[SIGNATURE-EMAIL] Errore invio email:', err)
    return false
  }
}

interface CompanyData {
  ragioneSociale: string
  partitaIva: string
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  pec?: string | null
  siteUrl?: string | null
  logoUrl?: string | null
}

export async function sendOtpEmail(
  to: string,
  otpCode: string,
  documentTitle: string,
  company?: CompanyData | null
): Promise<boolean> {
  const companyName = company?.ragioneSociale || 'FODI OS'
  const subject = `Codice OTP per firma: ${documentTitle}`

  const logoHtml = company?.logoUrl
    ? `<img src="${company.logoUrl}" alt="${companyName}" style="max-height: 40px; max-width: 160px; margin-bottom: 8px;" /><br/>`
    : ''

  const footerParts: string[] = []
  if (company) {
    footerParts.push(`${company.ragioneSociale} - ${company.indirizzo}, ${company.cap} ${company.citta} (${company.provincia})`)
    footerParts.push(`P.IVA: ${company.partitaIva}`)
    if (company.pec) footerParts.push(`PEC: ${company.pec}`)
    if (company.siteUrl) footerParts.push(company.siteUrl)
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    ${logoHtml}
    <h2 style="color: #1e293b; margin: 0 0 8px;">Codice di Verifica</h2>
    <p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">
      Per firmare il documento <strong>&ldquo;${documentTitle}&rdquo;</strong>, inserisci il seguente codice:
    </p>
    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${otpCode}</span>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      Il codice scade tra <strong>10 minuti</strong>. Non condividerlo con nessuno.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
      ${footerParts.length > 0 ? footerParts.join('<br/>') : `${companyName} - Sistema di Firma Digitale`}<br/>
      Se non hai richiesto questo codice, ignora questa email.
    </p>
  </div>
</body>
</html>`

  return sendViaSMTP(to, subject, html)
}
