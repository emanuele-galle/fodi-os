interface VCardData {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  jobTitle?: string | null
  company?: string | null
  bio?: string | null
  linkedinUrl?: string | null
  instagramUrl?: string | null
  twitterUrl?: string | null
  githubUrl?: string | null
  websiteUrl?: string | null
  whatsappNumber?: string | null
  facebookUrl?: string | null
  tiktokUrl?: string | null
  youtubeUrl?: string | null
  telegramUrl?: string | null
}

function escapeVCard(value: string): string {
  return value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n')
}

export function generateVCard(data: VCardData): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(data.lastName)};${escapeVCard(data.firstName)};;;`,
    `FN:${escapeVCard(data.firstName)} ${escapeVCard(data.lastName)}`,
  ]

  if (data.company) {
    lines.push(`ORG:${escapeVCard(data.company)}`)
  }
  if (data.jobTitle) {
    lines.push(`TITLE:${escapeVCard(data.jobTitle)}`)
  }
  if (data.email) {
    lines.push(`EMAIL;TYPE=INTERNET;TYPE=WORK:${data.email}`)
  }
  if (data.phone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${data.phone}`)
  }
  if (data.whatsappNumber) {
    lines.push(`TEL;TYPE=CELL:${data.whatsappNumber}`)
  }
  if (data.websiteUrl) {
    lines.push(`URL:${data.websiteUrl}`)
  }
  if (data.bio) {
    lines.push(`NOTE:${escapeVCard(data.bio)}`)
  }

  // Social profiles
  if (data.linkedinUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${data.linkedinUrl}`)
  }
  if (data.instagramUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:${data.instagramUrl}`)
  }
  if (data.facebookUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=facebook:${data.facebookUrl}`)
  }
  if (data.twitterUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=twitter:${data.twitterUrl}`)
  }
  if (data.githubUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=github:${data.githubUrl}`)
  }
  if (data.tiktokUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=tiktok:${data.tiktokUrl}`)
  }
  if (data.youtubeUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=youtube:${data.youtubeUrl}`)
  }
  if (data.telegramUrl) {
    lines.push(`X-SOCIALPROFILE;TYPE=telegram:${data.telegramUrl}`)
  }

  lines.push('END:VCARD')
  return lines.join('\r\n')
}
