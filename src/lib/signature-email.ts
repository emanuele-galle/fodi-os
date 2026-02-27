import { sendViaSMTP } from '@/lib/email'
import { buildSignatureOtpEmail } from '@/lib/email-templates'

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
  const subject = `Codice OTP per firma: ${documentTitle}`
  const html = buildSignatureOtpEmail({ otpCode, documentTitle, company })
  return sendViaSMTP(to, subject, html)
}
