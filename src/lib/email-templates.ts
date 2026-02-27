import { brand } from '@/lib/branding'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl
const LOGO_URL = `${SITE_URL}/logo-light.png`

// ─── Escape HTML ────────────────────────────────────────────

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Shared Layout ──────────────────────────────────────────

interface EmailLayoutOptions {
  previewText: string
  title?: string
  body: string
  showLogo?: boolean
  accentColor?: string
}

function emailLayout(options: EmailLayoutOptions): string {
  const { previewText, body, showLogo = true, accentColor = '#111827' } = options

  const logoRow = showLogo ? `
  <!-- LOGO -->
  <tr><td style="padding:0 0 28px;text-align:center;">
    <img src="${LOGO_URL}" alt="${escapeHtml(brand.name)}" width="120" height="42" style="display:inline-block;" />
  </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(brand.name)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
*{box-sizing:border-box}
body,table,td{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
body{margin:0;padding:0;background:#F3F4F6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
a{text-decoration:none}
@media(max-width:600px){
  .outer{padding:12px!important}
  .inner{padding:28px 20px!important}
}
</style>
</head>
<body>
<!-- Preview text -->
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;">
<tr><td class="outer" style="padding:40px 16px;" align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  ${logoRow}

  <!-- MAIN CARD -->
  <tr><td style="background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td class="inner" style="padding:36px 32px 32px;">
        ${body}
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:28px 0;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">
      <a href="${SITE_URL}/dashboard" style="color:#6B7280;text-decoration:underline;">Dashboard</a>
      <span style="color:#D1D5DB;padding:0 8px;">&#183;</span>
      <a href="${SITE_URL}/settings" style="color:#6B7280;text-decoration:underline;">Impostazioni</a>
    </p>
    <p style="margin:0;font-size:11px;color:#D1D5DB;">${escapeHtml(brand.email.footerText)} &middot; Sistema Gestionale</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── CTA Button (table-based, Outlook-safe) ─────────────────

function ctaButton(text: string, href: string, bgColor = '#111827'): string {
  return `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="22%" fillcolor="${bgColor}" stroke="f">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${escapeHtml(text)}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
  <td style="background:${bgColor};border-radius:10px;text-align:center;">
    <a href="${href}" style="display:inline-block;background:${bgColor};color:#FFFFFF;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;line-height:1;">${escapeHtml(text)}</a>
  </td>
</tr></table>
<!--<![endif]-->`
}

// ─── 1. Login OTP Email ─────────────────────────────────────

export function buildLoginOtpEmail(params: { otpCode: string; ipAddress: string }): string {
  const { otpCode, ipAddress } = params
  return emailLayout({
    previewText: `Il tuo codice di verifica: ${otpCode}`,
    body: `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Nuovo accesso rilevato</h2>
      <p style="color:#6B7280;margin:0 0 24px;font-size:14px;line-height:1.5;">
        È stato rilevato un tentativo di accesso al tuo account da un indirizzo IP non riconosciuto:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:12px 16px;">
          <span style="color:#92400E;font-size:13px;"><strong>IP:</strong> ${escapeHtml(ipAddress)}</span>
        </td>
      </tr></table>
      <p style="color:#6B7280;margin:20px 0 16px;font-size:14px;">
        Inserisci il seguente codice per confermare la tua identità:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#F1F5F9;border-radius:8px;padding:20px;text-align:center;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;">${escapeHtml(otpCode)}</span>
        </td>
      </tr></table>
      <p style="color:#9CA3AF;font-size:12px;margin:20px 0 16px;">
        Il codice scade tra <strong>10 minuti</strong>. Non condividerlo con nessuno.
      </p>
      <div style="height:1px;background:#E5E7EB;margin:24px 0;"></div>
      <p style="color:#EF4444;font-size:12px;margin:0;">
        <strong>Se non sei stato tu</strong>, cambia immediatamente la tua password e contatta l'amministratore.
      </p>`,
  })
}

// ─── 2. Signature OTP Email ─────────────────────────────────

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

export function buildSignatureOtpEmail(params: {
  otpCode: string
  documentTitle: string
  company?: CompanyData | null
}): string {
  const { otpCode, documentTitle, company } = params
  const companyName = company?.ragioneSociale || brand.name

  const footerParts: string[] = []
  if (company) {
    footerParts.push(`${company.ragioneSociale} - ${company.indirizzo}, ${company.cap} ${company.citta} (${company.provincia})`)
    footerParts.push(`P.IVA: ${company.partitaIva}`)
    if (company.pec) footerParts.push(`PEC: ${company.pec}`)
    if (company.siteUrl) footerParts.push(company.siteUrl)
  }

  // Use company logo if available, otherwise standard logo
  const logoSrc = company?.logoUrl || LOGO_URL

  return emailLayout({
    previewText: `Codice di verifica per firmare "${documentTitle}"`,
    showLogo: !company?.logoUrl, // hide default logo if company has its own
    body: `
      ${company?.logoUrl ? `<div style="text-align:center;margin-bottom:16px;"><img src="${logoSrc}" alt="${escapeHtml(companyName)}" style="max-height:40px;max-width:160px;" /></div>` : ''}
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Codice di Verifica</h2>
      <p style="color:#6B7280;margin:0 0 24px;font-size:14px;line-height:1.5;">
        Per firmare il documento <strong>&ldquo;${escapeHtml(documentTitle)}&rdquo;</strong>, inserisci il seguente codice:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#F1F5F9;border-radius:8px;padding:20px;text-align:center;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;">${escapeHtml(otpCode)}</span>
        </td>
      </tr></table>
      <p style="color:#9CA3AF;font-size:12px;margin:20px 0 0;">
        Il codice scade tra <strong>10 minuti</strong>. Non condividerlo con nessuno.
      </p>
      <div style="height:1px;background:#E5E7EB;margin:24px 0;"></div>
      <p style="color:#9CA3AF;font-size:11px;margin:0;line-height:1.5;">
        ${footerParts.length > 0 ? footerParts.join('<br/>') : `${escapeHtml(companyName)} - Sistema di Firma Digitale`}<br/>
        Se non hai richiesto questo codice, ignora questa email.
      </p>`,
  })
}

// ─── 3. Password Reset Email ────────────────────────────────

export function buildPasswordResetEmail(params: { firstName: string; resetUrl: string }): string {
  const { firstName, resetUrl } = params
  return emailLayout({
    previewText: `Reimposta la password del tuo account ${brand.name}`,
    body: `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Reset Password</h2>
      <p style="color:#6B7280;margin:0 0 24px;font-size:14px;line-height:1.5;">
        Ciao <strong>${escapeHtml(firstName)}</strong>, hai richiesto il reset della password del tuo account ${escapeHtml(brand.name)}.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        ${ctaButton('Reimposta Password', resetUrl, '#3B82F6')}
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:0 0 16px;">
        Il link scade tra <strong>1 ora</strong>. Se non hai richiesto il reset, ignora questa email.
      </p>`,
  })
}

// ─── 4. Signature Declined Email ────────────────────────────

export function buildSignatureDeclinedEmail(params: {
  recipientFirstName: string
  signerName: string
  documentTitle: string
  reason?: string | null
}): string {
  const { recipientFirstName, signerName, documentTitle, reason } = params
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || SITE_URL}/erp/signatures`

  return emailLayout({
    previewText: `${signerName} ha rifiutato di firmare "${documentTitle}"`,
    accentColor: '#EF4444',
    body: `
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <span style="color:#991B1B;font-size:13px;font-weight:600;">Firma rifiutata</span>
        </td>
      </tr></table>
      <h2 style="margin:16px 0 8px;font-size:22px;font-weight:800;color:#111827;">Documento non firmato</h2>
      <p style="color:#6B7280;margin:0 0 20px;font-size:14px;line-height:1.5;">
        Ciao <strong>${escapeHtml(recipientFirstName)}</strong>,<br/>
        <strong>${escapeHtml(signerName)}</strong> ha rifiutato di firmare il documento <strong>&ldquo;${escapeHtml(documentTitle)}&rdquo;</strong>.
      </p>
      ${reason ? `
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px 16px;">
          <span style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Motivo</span><br/>
          <span style="font-size:14px;color:#374151;line-height:1.5;">${escapeHtml(reason)}</span>
        </td>
      </tr></table>` : ''}
      <div style="text-align:center;margin:24px 0 0;">
        ${ctaButton('Visualizza dettagli', dashboardUrl)}
      </div>`,
  })
}

// ─── 5. Signature Completed Email ───────────────────────────

export function buildSignatureCompletedEmail(params: {
  recipientFirstName: string
  signerName: string
  documentTitle: string
}): string {
  const { recipientFirstName, signerName, documentTitle } = params
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || SITE_URL}/erp/signatures`

  return emailLayout({
    previewText: `${signerName} ha firmato "${documentTitle}"`,
    accentColor: '#10B981',
    body: `
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#F0FDF4;border-left:4px solid #10B981;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <span style="color:#166534;font-size:13px;font-weight:600;">Documento firmato</span>
        </td>
      </tr></table>
      <h2 style="margin:16px 0 8px;font-size:22px;font-weight:800;color:#111827;">Firma completata</h2>
      <p style="color:#6B7280;margin:0 0 24px;font-size:14px;line-height:1.5;">
        Ciao <strong>${escapeHtml(recipientFirstName)}</strong>,<br/>
        <strong>${escapeHtml(signerName)}</strong> ha firmato il documento <strong>&ldquo;${escapeHtml(documentTitle)}&rdquo;</strong>.
      </p>
      <div style="text-align:center;margin:0 0 0;">
        ${ctaButton('Visualizza dettagli', dashboardUrl, '#10B981')}
      </div>`,
  })
}

// ─── 6. Report Individual Email ─────────────────────────────

export function buildReportIndividualEmail(params: {
  dateFormatted: string
  userName: string
  totalHours: number
  tasksCompleted: number
}): string {
  const { dateFormatted, userName, totalHours, tasksCompleted } = params

  return emailLayout({
    previewText: `Report giornaliero del ${dateFormatted}: ${totalHours.toFixed(1)} ore, ${tasksCompleted} task`,
    body: `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Il tuo Report — ${escapeHtml(dateFormatted)}</h2>
      <p style="color:#6B7280;font-size:14px;margin:0 0 20px;line-height:1.5;">
        Ciao <strong>${escapeHtml(userName)}</strong>, ecco il riepilogo della tua giornata.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
        <tr>
          <td width="50%" style="background:#F8FAFC;padding:20px;text-align:center;border-right:1px solid #E5E7EB;">
            <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Ore registrate</div>
            <div style="font-size:28px;font-weight:800;color:#111827;line-height:1;">${totalHours.toFixed(1)}</div>
          </td>
          <td width="50%" style="background:#F8FAFC;padding:20px;text-align:center;">
            <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Task completati</div>
            <div style="font-size:28px;font-weight:800;color:#111827;line-height:1;">${tasksCompleted}</div>
          </td>
        </tr>
      </table>
      <p style="color:#6B7280;font-size:13px;margin:20px 0 0;line-height:1.5;">
        Il report completo è allegato in formato PDF.
      </p>`,
  })
}

// ─── 7. Report Summary Email ────────────────────────────────

export function buildReportSummaryEmail(params: {
  dateFormatted: string
  reportCount: number
  fileNames: string[]
}): string {
  const { dateFormatted, reportCount, fileNames } = params
  const fileList = fileNames.map(f => `<tr><td style="padding:4px 0;font-size:13px;color:#374151;">&#128196; ${escapeHtml(f)}</td></tr>`).join('')

  return emailLayout({
    previewText: `${reportCount} report giornalieri generati per il ${dateFormatted}`,
    body: `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Report Giornalieri — ${escapeHtml(dateFormatted)}</h2>
      <p style="color:#6B7280;font-size:14px;margin:0 0 20px;line-height:1.5;">
        Sono stati generati <strong>${reportCount}</strong> report giornalieri. Trovi i PDF in allegato.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;padding:16px;">
          <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Report allegati</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${fileList}
          </table>
        </td>
      </tr></table>`,
  })
}
