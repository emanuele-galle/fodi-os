/**
 * Import contabilità dal file "Gestore Attività PRO 2026 OK.xlsm"
 * → Muscari OS (bank_accounts, business_entities, incomes, expenses, accounting_categories)
 *
 * Esecuzione:
 *   cd /var/www/projects/muscari-os
 *   DATABASE_URL="postgresql://muscari_user:...@localhost:5446/muscari_os_db" npx tsx prisma/import-contabilita.ts
 */

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Find the file (handle unicode in filename)
const UPLOADS_DIR = '/var/www/uploads'
const xlsxFile = fs.readdirSync(UPLOADS_DIR).find(f => f.startsWith('Gestore') && f.endsWith('.xlsm'))
if (!xlsxFile) {
  console.error('ERRORE: File Excel non trovato in /var/www/uploads/')
  process.exit(1)
}
const XLSX_PATH = path.join(UPLOADS_DIR, xlsxFile)

// ============================================================
// HELPERS
// ============================================================

function parseVatRate(s: string | null | undefined): string {
  if (!s) return '22'
  const m = String(s).match(/(\d+)/)
  return m ? m[1] : '22'
}

function parseDeductibility(s: string | null | undefined): string {
  if (!s) return '100'
  const m = String(s).match(/(\d+)/)
  return m ? m[1] : '100'
}

function parseDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  // XLSX serial date number
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return new Date(d.y, d.m - 1, d.d)
  }
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}

function cleanStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function cleanAmount(v: unknown): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('=== Import Contabilità → Muscari OS ===\n')
  console.log('File:', XLSX_PATH)

  const wb = XLSX.readFile(XLSX_PATH, { type: 'file', cellDates: true })

  // ============================================================
  // FASE 1: Bank Accounts (from IMPOSTAZIONI sheet)
  // ============================================================
  console.log('\nFase 1: Importing bank accounts...')

  const bankAccounts = [
    { name: 'Contanti', type: 'cash', icon: '💶', sortOrder: 1 },
    { name: 'BPER "2.0"', type: 'bank', icon: '🏛️', sortOrder: 2 },
    { name: 'BPER "IO"', type: 'bank', icon: '🏛️', sortOrder: 3 },
    { name: 'PERSONALI', type: 'bank', icon: '🏛️', sortOrder: 4 },
    { name: 'BANCA GENERALI', type: 'bank', icon: '🏛️', sortOrder: 5 },
    // Credit cards
    { name: 'AMEX 2.0', type: 'credit_card', icon: '💳', sortOrder: 6 },
    { name: 'MasterCard 2.0', type: 'credit_card', icon: '💳', sortOrder: 7 },
    { name: 'AMEX IO', type: 'credit_card', icon: '💳', sortOrder: 8 },
  ]

  const bankAccountMap = new Map<string, string>() // name (normalized) → id

  for (const ba of bankAccounts) {
    const record = await prisma.bankAccount.create({
      data: ba,
    })
    bankAccountMap.set(ba.name.toUpperCase().trim(), record.id)
    console.log('  Bank: ' + ba.name + ' (' + ba.type + ')')
  }

  // Also map common variants from the Excel
  const bankNameAliases: Record<string, string> = {
    'BANCA GENERALI ': 'BANCA GENERALI',
    'BANCA GENERALI': 'BANCA GENERALI',
    'BPER "2.0"': 'BPER "2.0"',
    'BPER "IO"': 'BPER "IO"',
    'PERSONALI': 'PERSONALI',
    'CONTANTI': 'Contanti',
    'AMEX 2.0': 'AMEX 2.0',
    'AMEX IO': 'AMEX IO',
    'MASTERCARD 2.0': 'MasterCard 2.0',
    'CC-AMEX 2.0': 'AMEX 2.0',
    'CC-MASTERCARD 2.0': 'MasterCard 2.0',
    'CC-AMEX IO': 'AMEX IO',
  }

  function resolveBankAccountId(name: string | null | undefined): string | null {
    if (!name) return null
    const n = cleanStr(name).toUpperCase()
    // Direct match
    if (bankAccountMap.has(n)) return bankAccountMap.get(n)!
    // Alias match
    for (const [alias, canonical] of Object.entries(bankNameAliases)) {
      if (n === alias.toUpperCase()) {
        return bankAccountMap.get(canonical.toUpperCase()) || null
      }
    }
    // Fuzzy: try contains
    for (const [key, id] of bankAccountMap) {
      if (n.includes(key) || key.includes(n)) return id
    }
    return null
  }

  // ============================================================
  // FASE 2: Business Entities (from ATTIVITÀ column in data)
  // ============================================================
  console.log('\nFase 2: Importing business entities...')

  const businessEntities = [
    { name: 'Mediacom Srl', sortOrder: 1 },
    { name: 'Storie Italiane', sortOrder: 2 },
    { name: 'Duepuntozero Srls', sortOrder: 3 },
  ]

  const entityMap = new Map<string, string>() // name (normalized) → id

  for (const be of businessEntities) {
    const record = await prisma.businessEntity.create({
      data: be,
    })
    entityMap.set(be.name.toUpperCase().trim(), record.id)
    console.log('  Entity: ' + be.name)
  }

  function resolveEntityId(name: string | null | undefined): string | null {
    if (!name) return null
    const n = cleanStr(name).toUpperCase()
    if (entityMap.has(n)) return entityMap.get(n)!
    for (const [key, id] of entityMap) {
      if (n.includes(key) || key.includes(n)) return id
    }
    return null
  }

  // ============================================================
  // FASE 3: Accounting Categories
  // ============================================================
  console.log('\nFase 3: Importing accounting categories...')

  const incomeCategories = [
    'COMUNICAZIONE INTEGRATA', 'VIDEO-PRODUZIONI', 'CONSULENZA', 'EVENTI',
    'CANONI WEB', 'CONVENTION', 'DIREZIONE E CONDUZIONE', 'PIANO EDITORIALE WEB',
    'ECCELLENZE ITALIANE', 'SALOTTO TV', 'GALA ECCELLENZE', 'LIBRI- IMPRESA',
    'LIBRI',
  ]
  const expenseCategories = [
    'COLLABORATORI', 'FORNITORI', 'Auto', 'RISTORANTI', 'HOTEL', 'VIAGGI',
    'RATA ATTREZZATURE', 'CANONE SERVER', 'FORNITORI WEB', 'CONSULENZE',
    'ATTREZZATURE', 'ACQUISTI ATTREZZATURE', 'TASSE', 'Commercialista',
    'Affitto', 'Luce', 'Acqua', 'Internet/Telefono', 'Manutenzione', 'Mobili',
    'ABBIGLIAMENTO', 'VESTITI', 'ARTISTI', 'SERVICE', 'CAMERAMEN', 'RADIO',
    'VERBALI', 'PALESTRA', 'TELEPASS',
  ]

  let catCount = 0
  for (const cat of incomeCategories) {
    await prisma.accountingCategory.upsert({
      where: { name_type: { name: cat.trim(), type: 'income' } },
      update: {},
      create: { name: cat.trim(), type: 'income', isActive: true, sortOrder: catCount++ },
    })
  }
  for (const cat of expenseCategories) {
    await prisma.accountingCategory.upsert({
      where: { name_type: { name: cat.trim(), type: 'expense' } },
      update: {},
      create: { name: cat.trim(), type: 'expense', isActive: true, sortOrder: catCount++ },
    })
  }
  console.log('  Categories: ' + incomeCategories.length + ' income, ' + expenseCategories.length + ' expense')

  // ============================================================
  // FASE 4: Import ENTRATE → incomes
  // ============================================================
  console.log('\nFase 4: Importing incomes (ENTRATE)...')

  const wsEntrate = wb.Sheets['ENTRATE']
  const entrateData = XLSX.utils.sheet_to_json<unknown[]>(wsEntrate, { header: 1, defval: null, raw: false, dateNF: 'yyyy-mm-dd' })
  // Data rows start at row 18 (0-indexed: 17), header at row 17 (0-indexed: 16)
  // Cols: C=2(active), D=3(paid), E=4(client ID), F=5(description), G=6(date),
  //   H=7(conto), J=9(attività), K=10(categoria), L=11(recurring icon),
  //   M=12(importo), N=13(iva%), P=15(netto), Q=16(iva_amount), R=17(note)

  // Re-read with raw values for proper date/number handling
  const wsE = wb.Sheets['ENTRATE']
  const entrateRaw = XLSX.utils.sheet_to_json<unknown[]>(wsE, { header: 1, defval: null, raw: true })

  let incomesCreated = 0
  let incomesSkipped = 0

  for (let i = 17; i < entrateRaw.length; i++) {
    const row = entrateRaw[i]
    if (!row || row[2] !== 1) continue // C col must be 1 (active)

    const clientName = cleanStr(row[4]) // E: client ID/name
    const description = cleanStr(row[5]) // F: description
    const dateVal = parseDate(row[6]) // G: date
    const conto = cleanStr(row[7]) // H: bank account
    const attivita = cleanStr(row[9]) // J: business entity
    const categoria = cleanStr(row[10]) // K: category
    const importo = cleanAmount(row[12]) // M: amount (gross)
    const ivaStr = cleanStr(row[13]) // N: IVA rate string
    const netto = cleanAmount(row[15]) // P: net amount
    const ivaAmount = cleanAmount(row[16]) // Q: IVA amount
    const note = cleanStr(row[17]) // R: notes
    const isPaid = row[3] === 1 // D: paid status
    const isRecurring = cleanStr(row[11]) === '🔄' // L: recurring icon

    if (!dateVal || importo === 0) {
      incomesSkipped++
      continue
    }

    const vatRate = parseVatRate(ivaStr)
    const bankAccountId = resolveBankAccountId(conto)
    const businessEntityId = resolveEntityId(attivita)

    // Build combined notes
    const notesParts: string[] = []
    if (description) notesParts.push(description)
    if (note) notesParts.push(note)
    if (isRecurring) notesParts.push('[ricorrente]')
    const combinedNotes = notesParts.join(' — ') || null

    try {
      await prisma.income.create({
        data: {
          isPaid,
          clientName: clientName || 'N/D',
          date: dateVal,
          bankAccountId,
          businessEntityId,
          category: categoria || 'Altro',
          amount: importo,
          vatRate,
          netAmount: netto || null,
          vatAmount: ivaAmount || null,
          notes: combinedNotes,
        },
      })
      incomesCreated++
    } catch (e: unknown) {
      console.log('  ERR income row ' + (i + 1) + ': ' + ((e as Error).message || '').substring(0, 80))
      incomesSkipped++
    }
  }
  console.log('  Incomes created: ' + incomesCreated + ', skipped: ' + incomesSkipped)

  // ============================================================
  // FASE 5: Import SPESE → expenses
  // ============================================================
  console.log('\nFase 5: Importing expenses (SPESE)...')

  const wsS = wb.Sheets['SPESE']
  const speseRaw = XLSX.utils.sheet_to_json<unknown[]>(wsS, { header: 1, defval: null, raw: true })
  // Cols: C=2(active), D=3(paid), E=4(supplier ID), F=5(desc?), G=6(date),
  //   H=7(conto), J=9(attività), K=10(categoria), L=11(recurring icon),
  //   M=12(importo), N=13(iva%), O=14(deducibilità%), Q=16(netto), R=17(iva_detr),
  //   S=18(note)

  let expensesCreated = 0
  let expensesSkipped = 0

  for (let i = 17; i < speseRaw.length; i++) {
    const row = speseRaw[i]
    if (!row || row[2] !== 1) continue

    const supplierName = cleanStr(row[4]) // E
    const description = cleanStr(row[5]) // F
    const dateVal = parseDate(row[6]) // G
    const conto = cleanStr(row[7]) // H
    const attivita = cleanStr(row[9]) // J
    const categoria = cleanStr(row[10]) // K
    const importo = cleanAmount(row[12]) // M
    const ivaStr = cleanStr(row[13]) // N
    const detStr = cleanStr(row[14]) // O
    const netto = cleanAmount(row[16]) // Q
    const ivaDetr = cleanAmount(row[17]) // R
    const note = cleanStr(row[18]) // S
    const isPaid = row[3] === 1 // D
    const isRecurring = cleanStr(row[11]) === '🔄' || cleanStr(row[11]) === '📕'

    if (!dateVal || importo === 0) {
      expensesSkipped++
      continue
    }

    const vatRate = parseVatRate(ivaStr)
    const deductibility = parseDeductibility(detStr)
    const bankAccountId = resolveBankAccountId(conto)
    const businessEntityId = resolveEntityId(attivita)

    // Build description/notes
    const descParts: string[] = []
    if (description) descParts.push(description)
    const descStr = supplierName || categoria || 'Spesa'

    const notesParts: string[] = []
    if (note) notesParts.push(note)
    if (isRecurring) notesParts.push('[ricorrente]')
    const combinedNotes = notesParts.join(' — ') || null

    try {
      await prisma.expense.create({
        data: {
          category: categoria || 'Altro',
          description: descStr,
          amount: importo,
          date: dateVal,
          isPaid,
          supplierName: supplierName || null,
          bankAccountId,
          businessEntityId,
          vatRate,
          deductibility,
          netAmount: netto || null,
          vatDeductible: ivaDetr || null,
          notes: combinedNotes,
          isRecurring: false, // We mark in notes instead
        },
      })
      expensesCreated++
    } catch (e: unknown) {
      console.log('  ERR expense row ' + (i + 1) + ': ' + ((e as Error).message || '').substring(0, 80))
      expensesSkipped++
    }
  }
  console.log('  Expenses created: ' + expensesCreated + ', skipped: ' + expensesSkipped)

  // ============================================================
  // FASE 6: Summary
  // ============================================================
  console.log('\n=== IMPORT CONTABILITÀ COMPLETATO ===')

  const [baCount, beCount, incCount, expCount, acCount] = await Promise.all([
    prisma.bankAccount.count(),
    prisma.businessEntity.count(),
    prisma.income.count(),
    prisma.expense.count(),
    prisma.accountingCategory.count(),
  ])
  console.log('  Bank accounts:         ' + baCount)
  console.log('  Business entities:     ' + beCount)
  console.log('  Accounting categories: ' + acCount)
  console.log('  Incomes:               ' + incCount)
  console.log('  Expenses:              ' + expCount)

  // Totals
  const incomeTotal = await prisma.income.aggregate({ _sum: { amount: true } })
  const expenseTotal = await prisma.expense.aggregate({ _sum: { amount: true } })
  console.log('\n  Totale entrate: €' + (Number(incomeTotal._sum.amount) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 }))
  console.log('  Totale uscite:  €' + (Number(expenseTotal._sum.amount) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 }))

  // Paid vs unpaid
  const incPaid = await prisma.income.count({ where: { isPaid: true } })
  const incUnpaid = await prisma.income.count({ where: { isPaid: false } })
  const expPaid = await prisma.expense.count({ where: { isPaid: true } })
  const expUnpaid = await prisma.expense.count({ where: { isPaid: false } })
  console.log('\n  Entrate: ' + incPaid + ' incassate, ' + incUnpaid + ' da incassare')
  console.log('  Uscite:  ' + expPaid + ' pagate, ' + expUnpaid + ' da pagare')

  // By category
  const incByCat = await prisma.income.groupBy({ by: ['category'], _sum: { amount: true }, _count: true, orderBy: { _sum: { amount: 'desc' } } })
  console.log('\n  Top categorie entrate:')
  for (const c of incByCat.slice(0, 8)) {
    console.log('    ' + c.category + ': €' + Number(c._sum.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 }) + ' (' + c._count + ' voci)')
  }

  const expByCat = await prisma.expense.groupBy({ by: ['category'], _sum: { amount: true }, _count: true, orderBy: { _sum: { amount: 'desc' } } })
  console.log('\n  Top categorie uscite:')
  for (const c of expByCat.slice(0, 8)) {
    console.log('    ' + c.category + ': €' + Number(c._sum.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 }) + ' (' + c._count + ' voci)')
  }

  await pool.end()
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error('ERRORE:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
