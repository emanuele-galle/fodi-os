// Centralized brand configuration — all client-specific values read from env vars.
// Default values are for the original "Fodi OS" deployment.
// To rebrand for a new client, set the BRAND_* env vars in .env / .env.docker.

const slug = process.env.BRAND_SLUG || 'muscari'

export const brand = {
  // Core identity
  name: process.env.BRAND_NAME || 'Muscari OS',
  nameLower: (process.env.BRAND_NAME || 'Muscari OS').toUpperCase(),
  slug,
  company: process.env.BRAND_COMPANY || 'Piero Muscari',
  companyUpper: (process.env.BRAND_COMPANY || 'PIERO MUSCARI').toUpperCase(),

  // URLs
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://os.pieromuscari.it',

  // Cookies (derived from slug)
  cookies: {
    access: `${slug}_access`,
    refresh: `${slug}_refresh`,
    portal: `${slug}_portal`,
    impersonate: `${slug}_impersonate`,
    theme: `${slug}-theme`,
  },

  // Storage keys (derived from slug)
  storageKeys: {
    theme: `${slug}-theme`,
    userPreferences: `${slug}-user-preferences`,
    stickyNotes: `${slug}-os-sticky-notes`,
    calendarTeam: `${slug}-calendar-team`,
    calendarSelected: `${slug}-calendar-selected`,
  },

  // Email
  email: {
    from: process.env.SMTP_FROM || 'noreply@pieromuscari.it',
    contactEmail: process.env.BRAND_CONTACT_EMAIL || 'info@pieromuscari.it',
    footerText: process.env.BRAND_COMPANY || 'Piero Muscari',
    placeholder: process.env.BRAND_EMAIL_PLACEHOLDER || 'nome@pieromuscari.it',
  },

  // Push notifications
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:info@pieromuscari.it',

  // Digital cards / wallet
  walletClassPrefix: `${slug}-card`,

  // Google Drive folder name
  driveFolderName: process.env.BRAND_NAME || 'Muscari OS',

  // S3 bucket
  s3Bucket: process.env.S3_BUCKET || 'muscari-os-assets',

  // Storage URL for tutorials/guides
  storageUrl: process.env.NEXT_PUBLIC_BRAND_STORAGE_URL || process.env.BRAND_STORAGE_URL || 'https://s3.fodivps1.cloud/muscari-os-assets/tutorials',

  // Website (external company website, not the OS)
  websiteUrl: process.env.BRAND_WEBSITE_URL || 'https://pieromuscari.it',

  // Meta / SEO
  description: process.env.BRAND_DESCRIPTION || 'Piattaforma di gestione aziendale Piero Muscari - CRM, Progetti, Contabilita, Team',

  // Logo paths (convention: /brands/{slug}/logo-{variant}.{ext})
  logo: {
    dark: process.env.BRAND_LOGO_DARK || `/brands/${slug}/logo-dark.svg`,
    light: process.env.BRAND_LOGO_LIGHT || `/brands/${slug}/logo-light.svg`,
  },

  // Copyright
  copyrightYear: new Date().getFullYear(),
} as const
