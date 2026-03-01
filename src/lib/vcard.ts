interface VCardData {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  jobTitle?: string | null
  company?: string | null
  bio?: string | null
  avatarUrl?: string | null
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

type VCardField = { key: keyof VCardData; format: (val: string) => string }

const VCARD_FIELDS: VCardField[] = [
  { key: 'company', format: (v) => `ORG:${escapeVCard(v)}` },
  { key: 'jobTitle', format: (v) => `TITLE:${escapeVCard(v)}` },
  { key: 'avatarUrl', format: (v) => `PHOTO;VALUE=URI:${v}` },
  { key: 'email', format: (v) => `EMAIL;TYPE=INTERNET;TYPE=WORK:${v}` },
  { key: 'phone', format: (v) => `TEL;TYPE=WORK,VOICE:${v}` },
  { key: 'whatsappNumber', format: (v) => `TEL;TYPE=CELL:${v}` },
  { key: 'websiteUrl', format: (v) => `URL:${v}` },
  { key: 'bio', format: (v) => `NOTE:${escapeVCard(v)}` },
]

const SOCIAL_FIELDS: { key: keyof VCardData; type: string }[] = [
  { key: 'linkedinUrl', type: 'linkedin' },
  { key: 'instagramUrl', type: 'instagram' },
  { key: 'facebookUrl', type: 'facebook' },
  { key: 'twitterUrl', type: 'twitter' },
  { key: 'githubUrl', type: 'github' },
  { key: 'tiktokUrl', type: 'tiktok' },
  { key: 'youtubeUrl', type: 'youtube' },
  { key: 'telegramUrl', type: 'telegram' },
]

export function generateVCard(data: VCardData): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(data.lastName)};${escapeVCard(data.firstName)};;;`,
    `FN:${escapeVCard(data.firstName)} ${escapeVCard(data.lastName)}`,
  ]

  for (const field of VCARD_FIELDS) {
    const val = data[field.key]
    if (val) lines.push(field.format(val))
  }

  for (const social of SOCIAL_FIELDS) {
    const val = data[social.key]
    if (val) lines.push(`X-SOCIALPROFILE;TYPE=${social.type}:${val}`)
  }

  lines.push('END:VCARD')
  return lines.join('\r\n')
}
