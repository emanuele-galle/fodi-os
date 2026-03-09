import { describe, it, expect } from 'vitest'
import { generateCSV } from '@/lib/export-csv'

describe('Export CSV - generateCSV', () => {
  it('generates CSV with headers only', () => {
    const csv = generateCSV(['Nome', 'Email', 'Ruolo'], [])
    expect(csv).toBe('Nome,Email,Ruolo')
  })

  it('generates CSV with headers and rows', () => {
    const csv = generateCSV(
      ['Nome', 'Email'],
      [
        ['Mario Rossi', 'mario@example.com'],
        ['Luigi Verdi', 'luigi@example.com'],
      ]
    )
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('Nome,Email')
    expect(lines[1]).toBe('Mario Rossi,mario@example.com')
    expect(lines[2]).toBe('Luigi Verdi,luigi@example.com')
  })

  it('escapes values containing commas', () => {
    const csv = generateCSV(['Descrizione'], [['Consulenza, Sviluppo']])
    const lines = csv.split('\n')
    expect(lines[1]).toBe('"Consulenza, Sviluppo"')
  })

  it('escapes values containing double quotes', () => {
    const csv = generateCSV(['Nota'], [['Detto "importante"']])
    const lines = csv.split('\n')
    expect(lines[1]).toBe('"Detto ""importante"""')
  })

  it('escapes values containing newlines', () => {
    const csv = generateCSV(['Testo'], [['Riga 1\nRiga 2']])
    // The value with newline should be quoted in the output
    expect(csv).toContain('"Riga 1\nRiga 2"')
  })

  it('handles empty cell values', () => {
    const csv = generateCSV(['A', 'B'], [['valore', '']])
    const lines = csv.split('\n')
    expect(lines[1]).toBe('valore,')
  })

  it('handles headers with special characters', () => {
    const csv = generateCSV(['Nome, Cognome', 'Importo (€)'], [['Test', '100']])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('"Nome, Cognome",Importo (€)')
  })
})
