// Client-safe brand configuration — only uses NEXT_PUBLIC_* env vars.
// Import this in client components ('use client') instead of branding.ts.

const slug = process.env.NEXT_PUBLIC_BRAND_SLUG || 'muscari'

export const brandClient = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'Muscari OS',
  slug,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://os.pieromuscari.it',
  contactEmail: process.env.NEXT_PUBLIC_BRAND_CONTACT_EMAIL || 'info@pieromuscari.it',

  // Logo paths (convention: /brands/{slug}/logo-{variant}.{ext})
  logo: {
    dark: process.env.NEXT_PUBLIC_BRAND_LOGO_DARK || `/brands/${slug}/logo-dark.svg`,
    light: process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT || `/brands/${slug}/logo-light.svg`,
  },

  colors: {
    primary: process.env.NEXT_PUBLIC_BRAND_COLOR_PRIMARY || '#007AFF',
    primaryDark: process.env.NEXT_PUBLIC_BRAND_COLOR_PRIMARY_DARK || '#0f3460',
    gradientStart: process.env.NEXT_PUBLIC_BRAND_GRADIENT_START || '#1a1a2e',
    gradientMid: process.env.NEXT_PUBLIC_BRAND_GRADIENT_MID || '#16213e',
    gradientEnd: process.env.NEXT_PUBLIC_BRAND_GRADIENT_END || '#0f3460',
  },

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
