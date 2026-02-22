import { brand } from '@/lib/branding'
import { PKPass } from 'passkit-generator'
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
}

export async function generateApplePass(cardData: CardData): Promise<Buffer> {
  const {
    APPLE_PASS_TYPE_ID,
    APPLE_TEAM_ID,
    APPLE_PASS_CERT_PATH,
    APPLE_PASS_KEY_PATH,
    APPLE_WWDR_CERT_PATH,
    NEXT_PUBLIC_SITE_URL,
  } = process.env

  if (!APPLE_PASS_TYPE_ID || !APPLE_TEAM_ID || !APPLE_PASS_CERT_PATH || !APPLE_PASS_KEY_PATH || !APPLE_WWDR_CERT_PATH) {
    throw new Error('Apple Wallet environment variables not configured')
  }

  const signerCert = fs.readFileSync(path.resolve(APPLE_PASS_CERT_PATH))
  const signerKey = fs.readFileSync(path.resolve(APPLE_PASS_KEY_PATH))
  const wwdr = fs.readFileSync(path.resolve(APPLE_WWDR_CERT_PATH))

  const cardUrl = `${NEXT_PUBLIC_SITE_URL || brand.siteUrl}/c/${cardData.slug}`
  const fullName = `${cardData.firstName} ${cardData.lastName}`

  const pass = new PKPass(
    {},
    {
      signerCert,
      signerKey,
      wwdr,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      serialNumber: `${brand.walletClassPrefix}-${cardData.slug}-${Date.now()}`,
      organizationName: cardData.company,
      description: `Business Card - ${fullName}`,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(18, 10, 30)',
      labelColor: 'rgb(168, 85, 247)',
    }
  )

  pass.type = 'generic'

  // Primary fields
  pass.primaryFields.push({
    key: 'name',
    label: 'NOME',
    value: fullName,
  })

  // Secondary fields
  if (cardData.jobTitle) {
    pass.secondaryFields.push({
      key: 'title',
      label: 'RUOLO',
      value: cardData.jobTitle,
    })
  }

  pass.secondaryFields.push({
    key: 'company',
    label: 'AZIENDA',
    value: cardData.company,
  })

  // Auxiliary fields
  if (cardData.email) {
    pass.auxiliaryFields.push({
      key: 'email',
      label: 'EMAIL',
      value: cardData.email,
    })
  }

  if (cardData.phone) {
    pass.auxiliaryFields.push({
      key: 'phone',
      label: 'TELEFONO',
      value: cardData.phone,
    })
  }

  // Back fields
  pass.backFields.push({
    key: 'url',
    label: 'Card Digitale',
    value: cardUrl,
  })

  if (cardData.cardBio) {
    pass.backFields.push({
      key: 'bio',
      label: 'Bio',
      value: cardData.cardBio,
    })
  }

  // QR code with card URL (no altText to avoid showing URL under QR)
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: cardUrl,
    messageEncoding: 'iso-8859-1',
  })


  // Add icon images - check multiple possible locations
  const possibleDirs = [
    path.resolve('public/wallet'),
    path.resolve('/app/public/wallet'),
    path.resolve('/app/certs/wallet-icons'),
  ]
  const imageFiles = ['icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png']

  for (const dir of possibleDirs) {
    if (!fs.existsSync(dir)) continue
    for (const filename of imageFiles) {
      const filePath = path.join(dir, filename)
      if (fs.existsSync(filePath)) {
        pass.addBuffer(filename, fs.readFileSync(filePath))
      }
    }
    break // use first found directory
  }

  const buffer = pass.getAsBuffer()
  return buffer
}
