// Centralized brand configuration — all client-specific values read from env vars.
// Default values are for the original "Fodi OS" deployment.
// To rebrand for a new client, set the BRAND_* env vars in .env / .env.docker.

const slug = process.env.BRAND_SLUG || 'fodi'

export const brand = {
  // Core identity
  name: process.env.BRAND_NAME || 'FODI OS',
  nameLower: (process.env.BRAND_NAME || 'FODI OS').toUpperCase(),
  slug,
  company: process.env.BRAND_COMPANY || 'FODI S.r.l.',
  companyUpper: (process.env.BRAND_COMPANY || 'FODI S.R.L.').toUpperCase(),

  // URLs
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://os.fodisrl.it',

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
    from: process.env.SMTP_FROM || 'noreply@fodisrl.it',
    contactEmail: process.env.BRAND_CONTACT_EMAIL || 'info@fodisrl.it',
    footerText: process.env.BRAND_COMPANY || 'FODI S.r.l.',
    placeholder: process.env.BRAND_EMAIL_PLACEHOLDER || 'nome@fodisrl.it',
  },

  // Push notifications
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:info@fodisrl.it',

  // Digital cards / wallet
  walletClassPrefix: `${slug}-card`,

  // Google Drive folder name
  driveFolderName: process.env.BRAND_NAME || 'FODI OS',

  // S3 bucket
  s3Bucket: process.env.S3_BUCKET || 'fodi-os-assets',

  // Storage URL for tutorials/guides
  storageUrl: process.env.BRAND_STORAGE_URL || 'https://storage.fodivps2.cloud/fodi-os-assets/tutorials',

  // Website (external company website, not the OS)
  websiteUrl: process.env.BRAND_WEBSITE_URL || 'https://fodisrl.it',

  // Meta / SEO
  description: process.env.BRAND_DESCRIPTION || 'Piattaforma di gestione aziendale FODI Srl - CRM, Progetti, Contabilita, Team',

  // Copyright
  copyrightYear: new Date().getFullYear(),
} as const
