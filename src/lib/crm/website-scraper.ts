/**
 * Lightweight website scraper for CRM insights.
 * Extracts meta tags, headings, and main text from a client's website.
 */

interface WebsiteProfile {
  title: string
  description: string
  headings: string[]
  bodySnippet: string
  socialLinks: string[]
  error?: string
}

const TIMEOUT_MS = 8000
const MAX_BODY_CHARS = 3000

export async function scrapeClientWebsite(rawUrl: string): Promise<WebsiteProfile | null> {
  const url = normalizeUrl(rawUrl)
  if (!url) return null

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MuscariOS-CRM/1.0)',
        'Accept': 'text/html',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)

    if (!res.ok) return { title: '', description: '', headings: [], bodySnippet: '', socialLinks: [], error: `HTTP ${res.status}` }

    const html = await res.text()
    return parseHtml(html)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { title: '', description: '', headings: [], bodySnippet: '', socialLinks: [], error: msg }
  }
}

function normalizeUrl(raw: string): string | null {
  let url = raw.trim()
  if (!url) return null
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  try {
    new URL(url)
    return url
  } catch {
    return null
  }
}

function parseHtml(html: string): WebsiteProfile {
  const title = extractTag(html, 'title')
  const description = extractMeta(html, 'description') || extractMeta(html, 'og:description')
  const headings = extractHeadings(html)
  const bodySnippet = extractBodyText(html)
  const socialLinks = extractSocialLinks(html)

  return { title, description, headings, bodySnippet, socialLinks }
}

function extractTag(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i')
  const match = html.match(re)
  return match ? decodeEntities(match[1].trim()) : ''
}

function extractMeta(html: string, name: string): string {
  const reNameContent = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
  const match1 = html.match(reNameContent)
  if (match1) return decodeEntities(match1[1].trim())

  const reContentName = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i')
  const match2 = html.match(reContentName)
  return match2 ? decodeEntities(match2[1].trim()) : ''
}

function extractHeadings(html: string): string[] {
  const headings: string[] = []
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi
  let match
  while ((match = re.exec(html)) !== null && headings.length < 10) {
    const text = stripTags(match[1]).trim()
    if (text.length > 2 && text.length < 200) headings.push(text)
  }
  return headings
}

function extractBodyText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
  text = stripTags(text)
  text = text.replace(/\s+/g, ' ').trim()
  return text.slice(0, MAX_BODY_CHARS)
}

function extractSocialLinks(html: string): string[] {
  const links: string[] = []
  const re = /href=["'](https?:\/\/(?:www\.)?(?:linkedin|facebook|instagram|twitter|x|youtube|tiktok)\.[a-z.]+\/[^"'\s]*)/gi
  let match
  while ((match = re.exec(html)) !== null && links.length < 6) {
    links.push(match[1])
  }
  return [...new Set(links)]
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
