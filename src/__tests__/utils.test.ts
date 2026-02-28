import { describe, it, expect } from 'vitest'
import { cn, slugify, formatCurrency, timeAgo } from '@/lib/utils'

describe('Utils - cn (classnames merge)', () => {
  it('merge classi semplici', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('gestisce conditional classes', () => {
    const condition = false
    expect(cn('base', condition && 'hidden', 'visible')).toBe('base visible')
  })

  it('merge tailwind classes senza duplicati', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('gestisce undefined e null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })
})

describe('Utils - slugify', () => {
  it('converte testo in slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('rimuove caratteri speciali', () => {
    expect(slugify('Progetto Alpha! #2')).toBe('progetto-alpha-2')
  })

  it('rimuove trattini iniziali e finali', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('gestisce stringa con accenti (li rimuove)', () => {
    expect(slugify('Caffè Latte')).toBe('caff-latte')
  })

  it('gestisce stringa vuota', () => {
    expect(slugify('')).toBe('')
  })
})

describe('Utils - formatCurrency', () => {
  it('formatta numeri in EUR con simbolo euro', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('€')
    // Verifica che il numero sia presente (formato puo variare per locale ICU)
    expect(result).toMatch(/1[\.,]?234/)
  })

  it('formatta zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('formatta stringhe numeriche', () => {
    const result = formatCurrency('500')
    expect(result).toContain('500')
    expect(result).toContain('€')
  })

  it('formatta numeri negativi', () => {
    const result = formatCurrency(-1000)
    expect(result).toContain('1000') // Senza full ICU il separatore potrebbe non esserci
    expect(result).toContain('€')
  })
})

describe('Utils - timeAgo', () => {
  it('ritorna "ora" per date recenti (<60s)', () => {
    const now = new Date().toISOString()
    expect(timeAgo(now)).toBe('ora')
  })

  it('ritorna minuti per <1h', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(fiveMinAgo)).toBe('5m fa')
  })

  it('ritorna ore per <24h', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(threeHoursAgo)).toBe('3h fa')
  })

  it('ritorna giorni per >= 24h', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(twoDaysAgo)).toBe('2g fa')
  })
})
