import { describe, it, expect } from 'vitest'
import { updateLeadSchema, convertLeadSchema } from '@/lib/validation/leads'
import { createTimeEntrySchema, updateTimeEntrySchema } from '@/lib/validation/tasks'

describe('Validation - updateLeadSchema', () => {
  it('accepts valid partial update', () => {
    const result = updateLeadSchema.safeParse({ status: 'CONTACTED' })
    expect(result.success).toBe(true)
  })

  it('accepts full update', () => {
    const result = updateLeadSchema.safeParse({
      name: 'Mario Rossi',
      email: 'mario@test.it',
      company: 'Acme Srl',
      phone: '+39 333 1234567',
      service: 'Web Development',
      message: 'Vorrei un sito web',
      source: 'website',
      status: 'QUALIFIED',
      notes: 'Cliente interessante',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateLeadSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = updateLeadSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = updateLeadSchema.safeParse({ status: 'INVALID_STATUS' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid statuses', () => {
    const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST']
    for (const status of statuses) {
      const result = updateLeadSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it('accepts nullable company', () => {
    const result = updateLeadSchema.safeParse({ company: null })
    expect(result.success).toBe(true)
  })
})

describe('Validation - convertLeadSchema', () => {
  it('accepts valid conversion data', () => {
    const result = convertLeadSchema.safeParse({ companyName: 'Nuova Azienda Srl' })
    expect(result.success).toBe(true)
  })

  it('rejects empty company name', () => {
    const result = convertLeadSchema.safeParse({ companyName: '' })
    expect(result.success).toBe(false)
  })

  it('defaults status to PROSPECT', () => {
    const result = convertLeadSchema.safeParse({ companyName: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('PROSPECT')
    }
  })

  it('accepts custom status', () => {
    const result = convertLeadSchema.safeParse({ companyName: 'Test', status: 'ACTIVE' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE')
    }
  })
})

const TEST_DATE = '2026-03-09'

describe('Validation - createTimeEntrySchema', () => {
  it('accepts valid time entry', () => {
    const result = createTimeEntrySchema.safeParse({
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      date: TEST_DATE,
      hours: 4.5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero hours', () => {
    const result = createTimeEntrySchema.safeParse({
      date: TEST_DATE,
      hours: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative hours', () => {
    const result = createTimeEntrySchema.safeParse({
      date: TEST_DATE,
      hours: -2,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = createTimeEntrySchema.safeParse({
      date: 'not-a-date',
      hours: 1,
    })
    expect(result.success).toBe(false)
  })

  it('defaults billable to true', () => {
    const result = createTimeEntrySchema.safeParse({
      date: TEST_DATE,
      hours: 2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.billable).toBe(true)
    }
  })

  it('rejects non-UUID taskId', () => {
    const result = createTimeEntrySchema.safeParse({
      taskId: 'invalid',
      date: TEST_DATE,
      hours: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('Validation - updateTimeEntrySchema', () => {
  it('accepts empty update', () => {
    const result = updateTimeEntrySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with hours', () => {
    const result = updateTimeEntrySchema.safeParse({ hours: 3 })
    expect(result.success).toBe(true)
  })

  it('rejects zero hours in update', () => {
    const result = updateTimeEntrySchema.safeParse({ hours: 0 })
    expect(result.success).toBe(false)
  })

  it('accepts nullable taskId', () => {
    const result = updateTimeEntrySchema.safeParse({ taskId: null })
    expect(result.success).toBe(true)
  })
})
