/**
 * Sanitizes HTML for safe rendering in CRM email previews.
 * Strips dangerous tags (script, iframe, object, embed, form, etc.)
 * and event handler attributes (onclick, onerror, etc.)
 * while preserving safe formatting tags used in email HTML.
 */

const DANGEROUS_TAGS = /(<\s*\/?\s*(script|iframe|object|embed|form|input|textarea|select|button|applet|base|link|meta|style|svg|math)[^>]*>)/gi
const EVENT_HANDLERS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URLS = /\s+(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi
const DATA_URLS = /\s+(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi

export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, '')
    .replace(EVENT_HANDLERS, '')
    .replace(JAVASCRIPT_URLS, '')
    .replace(DATA_URLS, '')
}
