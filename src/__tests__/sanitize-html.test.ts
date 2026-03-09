import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/utils'

describe('Utils - sanitizeHtml', () => {
  it('strips HTML tags', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('bold')
  })

  it('strips nested HTML tags', () => {
    expect(sanitizeHtml('<div><p>Hello <b>World</b></p></div>')).toBe('Hello World')
  })

  it('strips script tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")')
  })

  it('escapes ampersands', () => {
    expect(sanitizeHtml('A & B')).toBe('A &amp; B')
  })

  it('strips content that looks like an HTML tag (angle brackets with content)', () => {
    // '< 2 >' matches the tag-stripping regex, so '1  0' remains, then ampersands are escaped
    const result = sanitizeHtml('1 < 2 > 0')
    expect(result).toBe('1  0')
  })

  it('escapes standalone less-than after tag stripping', () => {
    // After stripping tags, remaining '<' and '>' are escaped
    const result = sanitizeHtml('a &lt; b')
    expect(result).toContain('&amp;lt;')
  })

  it('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('handles plain text without HTML', () => {
    expect(sanitizeHtml('Hello World')).toBe('Hello World')
  })

  it('strips self-closing tags', () => {
    expect(sanitizeHtml('Line<br/>Break')).toBe('LineBreak')
  })

  it('handles complex XSS attempts', () => {
    const input = '<img src=x onerror=alert(1)>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<')
    expect(result).not.toContain('onerror')
  })
})
