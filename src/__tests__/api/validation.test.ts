import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  updateTaskSchema,
  createChannelSchema,
  createMessageSchema,
  createWikiPageSchema,
  createClientSchema,
  createInvoiceSchema,
  createQuoteSchema,
} from '@/lib/validation'

describe('Validation - createTaskSchema', () => {
  it('accetta dati validi minimi', () => {
    const result = createTaskSchema.safeParse({ title: 'Test task' })
    expect(result.success).toBe(true)
  })

  it('accetta dati validi completi', () => {
    const result = createTaskSchema.safeParse({
      title: 'Test task',
      description: 'Descrizione',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      assigneeId: '550e8400-e29b-41d4-a716-446655440001',
      priority: 'HIGH',
      boardColumn: 'in-progress',
      dueDate: '2026-03-01T00:00:00.000Z',
      estimatedHours: 8,
      tags: ['frontend', 'urgente'],
      isPersonal: false,
    })
    expect(result.success).toBe(true)
  })

  it('rifiuta titolo vuoto', () => {
    const result = createTaskSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('rifiuta titolo troppo lungo (>300)', () => {
    const result = createTaskSchema.safeParse({ title: 'a'.repeat(301) })
    expect(result.success).toBe(false)
  })

  it('rifiuta priority non valida', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', priority: 'SUPER_HIGH' })
    expect(result.success).toBe(false)
  })

  it('rifiuta projectId non UUID', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', projectId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('default priority a MEDIUM', () => {
    const result = createTaskSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe('MEDIUM')
    }
  })

  it('default tags a array vuoto', () => {
    const result = createTaskSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
    }
  })
})

describe('Validation - updateTaskSchema', () => {
  it('accetta update parziale', () => {
    const result = updateTaskSchema.safeParse({ status: 'DONE' })
    expect(result.success).toBe(true)
  })

  it('accetta tutti gli status validi', () => {
    const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']
    for (const status of statuses) {
      const result = updateTaskSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it('rifiuta status non valido', () => {
    const result = updateTaskSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accetta assigneeId nullable', () => {
    const result = updateTaskSchema.safeParse({ assigneeId: null })
    expect(result.success).toBe(true)
  })

  it('accetta oggetto vuoto (nessun campo)', () => {
    const result = updateTaskSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('Validation - createChannelSchema', () => {
  it('accetta canale valido minimo', () => {
    const result = createChannelSchema.safeParse({ name: 'generale' })
    expect(result.success).toBe(true)
  })

  it('accetta canale completo', () => {
    const result = createChannelSchema.safeParse({
      name: 'Progetto Alpha',
      description: 'Canale del progetto',
      type: 'PROJECT',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      memberIds: ['550e8400-e29b-41d4-a716-446655440001'],
    })
    expect(result.success).toBe(true)
  })

  it('rifiuta nome vuoto', () => {
    const result = createChannelSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rifiuta tipo non valido', () => {
    const result = createChannelSchema.safeParse({ name: 'test', type: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('default type a PUBLIC', () => {
    const result = createChannelSchema.safeParse({ name: 'test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('PUBLIC')
    }
  })
})

describe('Validation - createMessageSchema', () => {
  it('accetta messaggio valido', () => {
    const result = createMessageSchema.safeParse({ content: 'Ciao a tutti!' })
    expect(result.success).toBe(true)
  })

  it('rifiuta messaggio vuoto', () => {
    const result = createMessageSchema.safeParse({ content: '' })
    expect(result.success).toBe(false)
  })

  it('rifiuta messaggio troppo lungo (>10000)', () => {
    const result = createMessageSchema.safeParse({ content: 'a'.repeat(10001) })
    expect(result.success).toBe(false)
  })

  it('accetta tipo FILE_LINK', () => {
    const result = createMessageSchema.safeParse({ content: 'file.pdf', type: 'FILE_LINK' })
    expect(result.success).toBe(true)
  })

  it('default type a TEXT', () => {
    const result = createMessageSchema.safeParse({ content: 'test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('TEXT')
    }
  })
})

describe('Validation - createWikiPageSchema', () => {
  it('accetta pagina wiki valida minima', () => {
    const result = createWikiPageSchema.safeParse({ title: 'Guida Setup' })
    expect(result.success).toBe(true)
  })

  it('accetta pagina completa', () => {
    const result = createWikiPageSchema.safeParse({
      parentId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Sotto-pagina',
      content: { type: 'doc', content: [] },
      contentText: 'Testo della pagina',
      category: 'tecnico',
      icon: '📘',
    })
    expect(result.success).toBe(true)
  })

  it('rifiuta titolo vuoto', () => {
    const result = createWikiPageSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('rifiuta parentId non UUID', () => {
    const result = createWikiPageSchema.safeParse({ title: 'Test', parentId: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('default category a general', () => {
    const result = createWikiPageSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe('general')
    }
  })
})

describe('Validation - createClientSchema', () => {
  it('accetta cliente valido minimo', () => {
    const result = createClientSchema.safeParse({ companyName: 'Acme Srl' })
    expect(result.success).toBe(true)
  })

  it('accetta cliente completo', () => {
    const result = createClientSchema.safeParse({
      companyName: 'Acme Srl',
      vatNumber: 'IT12345678901',
      pec: 'acme@pec.it',
      sdi: 'ABC1234',
      website: 'https://acme.it',
      industry: 'Tecnologia',
      source: 'Referral',
      status: 'ACTIVE',
      notes: 'Cliente importante',
      tags: ['premium', 'tech'],
    })
    expect(result.success).toBe(true)
  })

  it('rifiuta nome azienda vuoto', () => {
    const result = createClientSchema.safeParse({ companyName: '' })
    expect(result.success).toBe(false)
  })

  it('rifiuta PEC non valida', () => {
    const result = createClientSchema.safeParse({
      companyName: 'Test',
      pec: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accetta PEC vuota (stringa vuota)', () => {
    const result = createClientSchema.safeParse({
      companyName: 'Test',
      pec: '',
    })
    expect(result.success).toBe(true)
  })

  it('rifiuta status non valido', () => {
    const result = createClientSchema.safeParse({
      companyName: 'Test',
      status: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('default status a LEAD', () => {
    const result = createClientSchema.safeParse({ companyName: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('LEAD')
    }
  })
})

describe('Validation - createQuoteSchema', () => {
  const validQuote = {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Preventivo Sito Web',
    lineItems: [
      { description: 'Sviluppo frontend', quantity: 1, unitPrice: 5000 },
    ],
  }

  it('accetta preventivo valido', () => {
    const result = createQuoteSchema.safeParse(validQuote)
    expect(result.success).toBe(true)
  })

  it('rifiuta senza clientId', () => {
    const { clientId, ...rest } = validQuote
    const result = createQuoteSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rifiuta senza lineItems', () => {
    const { lineItems, ...rest } = validQuote
    const result = createQuoteSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rifiuta lineItems vuoti', () => {
    const result = createQuoteSchema.safeParse({ ...validQuote, lineItems: [] })
    expect(result.success).toBe(false)
  })

  it('rifiuta prezzo unitario negativo', () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      lineItems: [{ description: 'Test', quantity: 1, unitPrice: -100 }],
    })
    expect(result.success).toBe(false)
  })

  it('default taxRate a 22', () => {
    const result = createQuoteSchema.safeParse(validQuote)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.taxRate).toBe(22)
    }
  })
})

describe('Validation - createInvoiceSchema', () => {
  const validInvoice = {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Fattura Sito Web',
    lineItems: [
      { description: 'Sviluppo frontend', quantity: 1, unitPrice: 5000 },
    ],
  }

  it('accetta fattura valida con lineItems', () => {
    const result = createInvoiceSchema.safeParse(validInvoice)
    expect(result.success).toBe(true)
  })

  it('accetta fattura valida con quoteId (senza lineItems)', () => {
    const result = createInvoiceSchema.safeParse({
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Fattura da preventivo',
      quoteId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('rifiuta senza clientId', () => {
    const { clientId, ...rest } = validInvoice
    const result = createInvoiceSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rifiuta senza lineItems ne quoteId', () => {
    const result = createInvoiceSchema.safeParse({
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Fattura vuota',
    })
    expect(result.success).toBe(false)
  })

  it('default taxRate a 22', () => {
    const result = createInvoiceSchema.safeParse(validInvoice)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.taxRate).toBe(22)
    }
  })

  it('rifiuta taxRate > 100', () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, taxRate: 150 })
    expect(result.success).toBe(false)
  })
})
