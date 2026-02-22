import { brand } from '@/lib/branding'
import * as jose from 'jose'
import fs from 'fs'
import path from 'path'

type CardData = {
  slug: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  email?: string | null
  phone?: string | null
  company: string
  cardBio?: string | null
  avatarUrl?: string | null
}

let cachedToken: { token: string; expires: number } | null = null

async function getAccessToken(saKey: { client_email: string; private_key: string }): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const privateKey = await jose.importPKCS8(saKey.private_key, 'RS256')
  const jwt = await new jose.SignJWT({
    iss: saKey.client_email,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return data.access_token
}

const API = 'https://walletobjects.googleapis.com/walletobjects/v1'

async function ensureClass(iid: string, company: string, token: string) {
  const classId = `${iid}.${brand.walletClassPrefix}`
  const res = await fetch(`${API}/genericClass/${classId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) return classId

  // Create class if it doesn't exist
  await fetch(`${API}/genericClass`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: classId, issuerName: company }),
  })
  return classId
}

async function createOrUpdateObject(
  iid: string,
  classId: string,
  cardData: CardData,
  cardUrl: string,
  fullName: string,
  token: string,
): Promise<string> {
  const objectId = `${iid}.${brand.walletClassPrefix}-${cardData.slug}`

  const textModulesData: Array<{ id: string; header: string; body: string }> = []
  if (cardData.jobTitle) textModulesData.push({ id: 'title', header: 'RUOLO', body: cardData.jobTitle })
  textModulesData.push({ id: 'company', header: 'AZIENDA', body: cardData.company })
  if (cardData.email) textModulesData.push({ id: 'email', header: 'EMAIL', body: cardData.email })
  if (cardData.phone) textModulesData.push({ id: 'phone', header: 'TELEFONO', body: cardData.phone })

  const obj: Record<string, unknown> = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    cardTitle: { defaultValue: { language: 'it', value: 'Business Card' } },
    header: { defaultValue: { language: 'it', value: fullName } },
    subheader: cardData.jobTitle ? { defaultValue: { language: 'it', value: cardData.jobTitle } } : undefined,
    textModulesData,
    barcode: { type: 'QR_CODE', value: cardUrl },
    linksModuleData: {
      uris: [{ uri: cardUrl, description: 'Apri Card Digitale', id: 'card-url' }],
    },
    hexBackgroundColor: '#120a1e',
  }

  if (cardData.avatarUrl) {
    obj.logo = {
      sourceUri: { uri: cardData.avatarUrl },
      contentDescription: { defaultValue: { language: 'it', value: fullName } },
    }
  }

  // Try to get existing object
  const getRes = await fetch(`${API}/genericObject/${objectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (getRes.ok) {
    // Update existing
    await fetch(`${API}/genericObject/${objectId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(obj),
    })
  } else {
    // Create new
    await fetch(`${API}/genericObject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(obj),
    })
  }

  return objectId
}

export async function generateGoogleWalletUrl(cardData: CardData): Promise<string> {
  const {
    GOOGLE_WALLET_ISSUER_ID,
    GOOGLE_WALLET_SA_KEY_PATH,
    NEXT_PUBLIC_SITE_URL,
  } = process.env

  if (!GOOGLE_WALLET_ISSUER_ID || !GOOGLE_WALLET_SA_KEY_PATH) {
    throw new Error('Google Wallet environment variables not configured')
  }

  const saKeyPath = path.resolve(GOOGLE_WALLET_SA_KEY_PATH)
  const saKey = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'))
  const siteUrl = NEXT_PUBLIC_SITE_URL || brand.siteUrl
  const cardUrl = `${siteUrl}/c/${cardData.slug}`
  const fullName = `${cardData.firstName} ${cardData.lastName}`
  const iid = GOOGLE_WALLET_ISSUER_ID

  // Create the full object via REST API (supports logo, links, etc.)
  const token = await getAccessToken(saKey)
  const classId = await ensureClass(iid, cardData.company, token)
  const objectId = await createOrUpdateObject(iid, classId, cardData, cardUrl, fullName, token)

  // Generate a thin JWT that just references the existing object
  const privateKey = await jose.importPKCS8(saKey.private_key, 'RS256')
  const claims = {
    iss: saKey.client_email,
    aud: 'google',
    origins: [siteUrl],
    typ: 'savetowallet',
    payload: {
      genericObjects: [{ id: objectId }],
    },
  }

  const jwt = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .sign(privateKey)

  return `https://pay.google.com/gp/v/save/${jwt}`
}
