import { describe, it, expect } from 'vitest'
import { generateVCard } from '@/lib/vcard'

describe('VCard - generateVCard', () => {
  it('generates basic vCard with name only', () => {
    const vcard = generateVCard({ firstName: 'Mario', lastName: 'Rossi' })
    expect(vcard).toContain('BEGIN:VCARD')
    expect(vcard).toContain('VERSION:3.0')
    expect(vcard).toContain('N:Rossi;Mario;;;')
    expect(vcard).toContain('FN:Mario Rossi')
    expect(vcard).toContain('END:VCARD')
  })

  it('uses CRLF line endings', () => {
    const vcard = generateVCard({ firstName: 'Mario', lastName: 'Rossi' })
    expect(vcard).toContain('\r\n')
    const lines = vcard.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCARD')
  })

  it('includes email when provided', () => {
    const vcard = generateVCard({ firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.it' })
    expect(vcard).toContain('EMAIL;TYPE=INTERNET;TYPE=WORK:mario@test.it')
  })

  it('includes phone when provided', () => {
    const vcard = generateVCard({ firstName: 'Mario', lastName: 'Rossi', phone: '+39 333 1234567' })
    expect(vcard).toContain('TEL;TYPE=WORK,VOICE:+39 333 1234567')
  })

  it('includes company and job title', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      company: 'Acme Srl',
      jobTitle: 'CEO',
    })
    expect(vcard).toContain('ORG:Acme Srl')
    expect(vcard).toContain('TITLE:CEO')
  })

  it('includes social profiles', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      linkedinUrl: 'https://linkedin.com/in/mario',
      instagramUrl: 'https://instagram.com/mario',
    })
    expect(vcard).toContain('X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/mario')
    expect(vcard).toContain('X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/mario')
  })

  it('omits null/undefined fields', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      email: null,
      phone: undefined,
      linkedinUrl: null,
    })
    expect(vcard).not.toContain('EMAIL')
    expect(vcard).not.toContain('TEL')
    expect(vcard).not.toContain('X-SOCIALPROFILE')
  })

  it('escapes special characters in values', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      company: 'Rossi, Bianchi & Partners',
    })
    expect(vcard).toContain('ORG:Rossi\\, Bianchi & Partners')
  })

  it('escapes semicolons in values', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      bio: 'CEO; Founder',
    })
    expect(vcard).toContain('NOTE:CEO\\; Founder')
  })

  it('includes WhatsApp number as CELL type', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      whatsappNumber: '+39 333 9876543',
    })
    expect(vcard).toContain('TEL;TYPE=CELL:+39 333 9876543')
  })

  it('includes website URL', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      websiteUrl: 'https://mariorossi.it',
    })
    expect(vcard).toContain('URL:https://mariorossi.it')
  })

  it('includes avatar photo URI', () => {
    const vcard = generateVCard({
      firstName: 'Mario',
      lastName: 'Rossi',
      avatarUrl: 'https://example.com/avatar.jpg',
    })
    expect(vcard).toContain('PHOTO;VALUE=URI:https://example.com/avatar.jpg')
  })
})
