// Client-safe brand configuration — only uses NEXT_PUBLIC_* env vars.
// Import this in client components ('use client') instead of branding.ts.

const slug = process.env.NEXT_PUBLIC_BRAND_SLUG || 'fodi'

export const brandClient = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'FODI OS',
  slug,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://os.fodisrl.it',
  contactEmail: process.env.NEXT_PUBLIC_BRAND_CONTACT_EMAIL || 'info@fodisrl.it',

  cookies: {
    theme: `${slug}-theme`,
  },

  storageKeys: {
    theme: `${slug}-theme`,
    userPreferences: `${slug}-user-preferences`,
    stickyNotes: `${slug}-os-sticky-notes`,
    calendarTeam: `${slug}-calendar-team`,
    calendarSelected: `${slug}-calendar-selected`,
  },
} as const
