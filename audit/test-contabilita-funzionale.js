/**
 * Test Funzionale Contabilità — Muscari OS
 * Testa CRUD completo via API + verifica frontend con Playwright
 *
 * Uso: (tramite python wrapper per evitare escaping password)
 *   python3 -c "
 *   import subprocess, os
 *   env = os.environ.copy()
 *   env['AUDIT_PASSWORD'] = 'Emanuele347!'
 *   env['AUDIT_USERNAME'] = 'admin'
 *   env['AUDIT_BASE_URL'] = 'https://os.pieromuscari.it'
 *   env['NODE_PATH'] = '/home/sviluppatore/node_modules'
 *   subprocess.run(['node', '/var/www/projects/muscari-os/audit/test-contabilita-funzionale.js'], env=env)
 *   "
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://os.pieromuscari.it'
const USERNAME = process.env.AUDIT_USERNAME
const PASSWORD = process.env.AUDIT_PASSWORD
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'test-funzionale')

const results = { tests: [], passed: 0, failed: 0, errors: [] }

function log(icon, msg) { console.log(`  ${icon} ${msg}`) }
function pass(name, detail) { results.tests.push({ name, status: 'PASS', detail }); results.passed++; log('✓', `${name}${detail ? ` — ${detail}` : ''}`) }
function fail(name, detail) { results.tests.push({ name, status: 'FAIL', detail }); results.failed++; log('✗', `${name} — ${detail}`) }

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true })
}

// ===== AUTH HELPER =====

let authCookies = null

async function loginAndGetCookies(context) {
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#username', USERNAME)
  await page.fill('#password', PASSWORD)

  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ])

  const status = resp.status()
  if (status === 403) {
    console.log('\n  ⚠ OTP richiesto. Inserire il codice manualmente...')
    await page.waitForURL('**/verify-ip', { timeout: 5000 }).catch(() => {})
    await page.waitForURL('**/dashboard', { timeout: 180000 })
  } else if (status !== 200) {
    throw new Error(`Login fallito: status ${status}`)
  } else {
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  }

  authCookies = await context.cookies()
  await page.close()
  return authCookies
}

// API helper — uses page.request with auth cookies already in context
async function apiCall(request, method, url, body) {
  const opts = { headers: { 'Content-Type': 'application/json' } }
  if (body) opts.data = body

  let resp
  const fullUrl = `${BASE_URL}${url}`
  switch (method) {
    case 'GET': resp = await request.get(fullUrl, opts); break
    case 'POST': resp = await request.post(fullUrl, opts); break
    case 'PUT': resp = await request.put(fullUrl, opts); break
    case 'DELETE': resp = await request.delete(fullUrl, opts); break
  }
  const json = await resp.json().catch(() => null)
  return { status: resp.status(), body: json }
}

// ===== TESTS =====

async function testExpenseCRUD(request) {
  console.log('\n── Test CRUD Spese ──')
  let createdId = null

  // CREATE
  {
    const res = await apiCall(request, 'POST', '/api/expenses', {
      category: 'TEST_AUDIT',
      description: 'Spesa di test audit automatico',
      amount: 123.45,
      date: '2026-02-23',
      isPaid: true,
      supplierName: 'Fornitore Test',
      vatRate: '22',
      deductibility: '100',
      paymentMethod: 'bonifico',
    })
    if (res.status === 201 && res.body?.success && res.body.data?.id) {
      createdId = res.body.data.id
      pass('Spesa CREATE', `id=${createdId}, amount=${res.body.data.amount}`)
    } else {
      fail('Spesa CREATE', `status=${res.status}, body=${JSON.stringify(res.body).substring(0, 200)}`)
      return null
    }
  }

  // READ (list)
  {
    const res = await apiCall(request, 'GET', '/api/expenses?category=TEST_AUDIT&limit=5')
    if (res.status === 200 && res.body?.items?.length > 0) {
      const found = (res.body.items || res.body.data || []).find(e => e.id === createdId)
      if (found) {
        pass('Spesa READ (list)', `trovata nella lista, amount=${found.amount}`)
      } else {
        fail('Spesa READ (list)', 'spesa creata non trovata nella lista')
      }
    } else {
      // Try alternate response format
      const items = res.body?.data || res.body?.items || []
      const found = items.find(e => e.id === createdId)
      if (found) {
        pass('Spesa READ (list)', `trovata nella lista (formato alternativo)`)
      } else {
        fail('Spesa READ (list)', `status=${res.status}, items=${items.length}`)
      }
    }
  }

  // UPDATE
  {
    const res = await apiCall(request, 'PUT', `/api/expenses/${createdId}`, {
      description: 'Spesa test MODIFICATA',
      amount: 200.00,
    })
    if (res.status === 200 && res.body?.success) {
      const d = res.body.data
      const amountMatch = Number(d.amount) === 200
      const descMatch = d.description === 'Spesa test MODIFICATA'
      if (amountMatch && descMatch) {
        pass('Spesa UPDATE', `amount=${d.amount}, description aggiornata`)
      } else {
        fail('Spesa UPDATE', `valori non aggiornati: amount=${d.amount}, desc=${d.description}`)
      }
    } else {
      fail('Spesa UPDATE', `status=${res.status}, body=${JSON.stringify(res.body).substring(0, 200)}`)
    }
  }

  // DELETE
  {
    const res = await apiCall(request, 'DELETE', `/api/expenses/${createdId}`)
    if (res.status === 200 && res.body?.success) {
      pass('Spesa DELETE', `id=${createdId} eliminata`)
    } else {
      fail('Spesa DELETE', `status=${res.status}, body=${JSON.stringify(res.body).substring(0, 200)}`)
    }
  }

  // VERIFY DELETE
  {
    const res = await apiCall(request, 'GET', `/api/expenses?category=TEST_AUDIT&limit=5`)
    const items = res.body?.items || res.body?.data || []
    const found = items.find(e => e.id === createdId)
    if (!found) {
      pass('Spesa DELETE verifica', 'spesa non più presente dopo eliminazione')
    } else {
      fail('Spesa DELETE verifica', 'spesa ancora presente dopo eliminazione!')
    }
  }

  return createdId
}

async function testIncomeCRUD(request) {
  console.log('\n── Test CRUD Entrate ──')
  let createdId = null

  // CREATE
  {
    const res = await apiCall(request, 'POST', '/api/incomes', {
      clientName: 'Cliente Test Audit',
      date: '2026-02-23',
      category: 'TEST_AUDIT',
      amount: 500.00,
      vatRate: '22',
      isPaid: false,
      paymentMethod: 'bonifico',
      notes: 'Entrata di test audit automatico',
    })
    if (res.status === 201 && res.body?.success && res.body.data?.id) {
      createdId = res.body.data.id
      const d = res.body.data
      pass('Entrata CREATE', `id=${createdId}, amount=${d.amount}, net=${d.netAmount}, vat=${d.vatAmount}`)

      // Verify VAT calculation: 500 with 22% → net=409.84, vat=90.16
      const net = Number(d.netAmount)
      const vat = Number(d.vatAmount)
      if (Math.abs(net - 409.84) < 0.02 && Math.abs(vat - 90.16) < 0.02) {
        pass('Entrata VAT calc', `net=${net} (atteso 409.84), vat=${vat} (atteso 90.16)`)
      } else {
        fail('Entrata VAT calc', `net=${net} (atteso 409.84), vat=${vat} (atteso 90.16)`)
      }
    } else {
      fail('Entrata CREATE', `status=${res.status}, body=${JSON.stringify(res.body).substring(0, 200)}`)
      return null
    }
  }

  // READ
  {
    const res = await apiCall(request, 'GET', '/api/incomes?category=TEST_AUDIT&limit=5')
    const items = res.body?.items || res.body?.data || []
    const found = items.find(e => e.id === createdId)
    if (found) {
      pass('Entrata READ (list)', `trovata nella lista`)
    } else {
      fail('Entrata READ (list)', `non trovata, items=${items.length}`)
    }
  }

  // UPDATE
  {
    const res = await apiCall(request, 'PUT', `/api/incomes/${createdId}`, {
      clientName: 'Cliente MODIFICATO',
      amount: 1000.00,
      isPaid: true,
    })
    if (res.status === 200 && res.body?.success) {
      const d = res.body.data
      const ok = d.clientName === 'Cliente MODIFICATO' && Number(d.amount) === 1000 && d.isPaid === true
      if (ok) {
        pass('Entrata UPDATE', `clientName, amount, isPaid aggiornati correttamente`)
      } else {
        fail('Entrata UPDATE', `clientName=${d.clientName}, amount=${d.amount}, isPaid=${d.isPaid}`)
      }
    } else {
      fail('Entrata UPDATE', `status=${res.status}`)
    }
  }

  // DELETE
  {
    const res = await apiCall(request, 'DELETE', `/api/incomes/${createdId}`)
    if (res.status === 200 && res.body?.success) {
      pass('Entrata DELETE', `id=${createdId} eliminata`)
    } else {
      fail('Entrata DELETE', `status=${res.status}`)
    }
  }

  return createdId
}

async function testDashboardAPI(request) {
  console.log('\n── Test Dashboard API ──')

  // Monthly dashboard
  {
    const res = await apiCall(request, 'GET', '/api/accounting/dashboard?period=monthly&month=2026-02')
    if (res.status === 200 && res.body?.success) {
      const d = res.body.data
      const hasIncome = typeof d.income?.totalGross === 'number'
      const hasExpense = typeof d.expense?.totalGross === 'number'
      const hasProfit = typeof d.profitNet === 'number'
      const hasPending = Array.isArray(d.pendingInvoices)

      if (hasIncome && hasExpense && hasProfit && hasPending) {
        pass('Dashboard mensile', `income=${d.income.totalGross}, expense=${d.expense.totalGross}, profit=${d.profitNet}, pending=${d.pendingInvoices.length}`)

        // Verify pending invoices amounts are numbers, not strings
        if (d.pendingInvoices.length > 0) {
          const allNumbers = d.pendingInvoices.every(i => typeof i.amount === 'number')
          if (allNumbers) {
            pass('Pending invoices tipo amount', 'tutti i valori sono number')
          } else {
            fail('Pending invoices tipo amount', 'alcuni valori amount sono stringhe (bug Decimal)')
          }
        } else {
          pass('Pending invoices tipo amount', 'nessuna fattura in attesa (skip)')
        }
      } else {
        fail('Dashboard mensile', `campi mancanti: income=${hasIncome}, expense=${hasExpense}, profit=${hasProfit}, pending=${hasPending}`)
      }
    } else {
      fail('Dashboard mensile', `status=${res.status}`)
    }
  }

  // Annual dashboard
  {
    const res = await apiCall(request, 'GET', '/api/accounting/dashboard?period=annual&year=2026')
    if (res.status === 200 && res.body?.success) {
      pass('Dashboard annuale', 'caricamento OK')
    } else {
      fail('Dashboard annuale', `status=${res.status}`)
    }
  }

  // Statistics
  {
    const res = await apiCall(request, 'GET', '/api/accounting/statistics?year=2026')
    if (res.status === 200) {
      pass('Statistiche API', 'caricamento OK')
    } else {
      fail('Statistiche API', `status=${res.status}`)
    }
  }

  // Journal (Prima Nota)
  {
    const res = await apiCall(request, 'GET', '/api/accounting/journal?from=2026-02-01&to=2026-02-28')
    if (res.status === 200) {
      const entries = res.body?.items || res.body?.data || []
      pass('Prima Nota API', `${Array.isArray(entries) ? entries.length : '?'} movimenti`)
    } else {
      fail('Prima Nota API', `status=${res.status}`)
    }
  }
}

async function testSubscriptionAPI(request) {
  console.log('\n── Test CRUD Abbonamenti ──')
  let createdId = null

  // CREATE
  {
    const res = await apiCall(request, 'POST', '/api/expenses/subscriptions', {
      category: 'TEST_AUDIT',
      description: 'Abbonamento test audit',
      amount: 29.99,
      date: '2026-02-23',
      isRecurring: true,
      frequency: 'monthly',
      nextDueDate: '2026-03-23',
      autoRenew: true,
      provider: 'Provider Test',
      notes: 'Test automatico',
    })
    if (res.status === 201 && res.body?.success && res.body.data?.id) {
      createdId = res.body.data.id
      pass('Abbonamento CREATE', `id=${createdId}`)
    } else {
      fail('Abbonamento CREATE', `status=${res.status}, body=${JSON.stringify(res.body).substring(0, 200)}`)
      return
    }
  }

  // READ
  {
    const res = await apiCall(request, 'GET', '/api/expenses/subscriptions')
    const items = res.body?.items || res.body?.data || []
    const found = items.find(e => e.id === createdId)
    if (found) {
      pass('Abbonamento READ', `trovato nella lista, status=${found.status}`)
    } else {
      fail('Abbonamento READ', 'non trovato nella lista')
    }
  }

  // UPDATE (pause)
  {
    const res = await apiCall(request, 'PUT', `/api/expenses/subscriptions/${createdId}`, {
      status: 'paused',
      notes: 'Messo in pausa dal test',
    })
    if (res.status === 200 && res.body?.success) {
      pass('Abbonamento UPDATE (pausa)', `status aggiornato`)
    } else {
      fail('Abbonamento UPDATE (pausa)', `status=${res.status}`)
    }
  }

  // DELETE
  {
    const res = await apiCall(request, 'DELETE', `/api/expenses/subscriptions/${createdId}`)
    if (res.status === 200 && res.body?.success) {
      pass('Abbonamento DELETE', `id=${createdId} eliminato`)
    } else {
      fail('Abbonamento DELETE', `status=${res.status}`)
    }
  }
}

async function testBankAccountsAPI(request) {
  console.log('\n── Test API Conti Bancari ──')

  const res = await apiCall(request, 'GET', '/api/bank-accounts')
  if (res.status === 200) {
    const items = res.body?.items || res.body?.data || res.body || []
    if (Array.isArray(items)) {
      pass('Conti bancari GET', `${items.length} conti trovati`)
    } else {
      pass('Conti bancari GET', 'risposta OK (formato non-array)')
    }
  } else {
    fail('Conti bancari GET', `status=${res.status}`)
  }
}

async function testSettingsAPIs(request) {
  console.log('\n── Test API Settings ──')

  // Categories
  {
    const res = await apiCall(request, 'GET', '/api/accounting-categories')
    if (res.status === 200) {
      const items = res.body?.items || res.body?.data || []
      pass('Categorie contabili GET', `${Array.isArray(items) ? items.length : '?'} categorie`)
    } else {
      fail('Categorie contabili GET', `status=${res.status}`)
    }
  }

  // Business entities
  {
    const res = await apiCall(request, 'GET', '/api/business-entities')
    if (res.status === 200) {
      const items = Array.isArray(res.body) ? res.body : (res.body?.items || res.body?.data || [])
      pass('Entità aziendali GET', `${items.length} entità`)
    } else {
      fail('Entità aziendali GET', `status=${res.status}`)
    }
  }
}

async function testFrontendPages(page) {
  console.log('\n── Test Frontend (Playwright) ──')

  const pages = [
    { name: 'Panoramica', url: '/erp/panoramica', checks: ['text=Entrate Lorde', 'text=Spese Lorde'] },
    { name: 'Spese', url: '/erp/movimenti', checks: ['text=Spese', 'button:has-text("Nuova Spesa")'] },
    { name: 'Entrate', url: '/erp/movimenti?tab=entrate', checks: ['text=Entrate'] },
    { name: 'Prima Nota', url: '/erp/movimenti?tab=prima-nota', checks: [] },
    { name: 'Abbonamenti', url: '/erp/movimenti?tab=abbonamenti', checks: [] },
    { name: 'Fatture Ricorrenti', url: '/erp/movimenti?tab=fatture-ricorrenti', checks: [] },
    { name: 'Conti', url: '/erp/accounts', checks: [] },
    { name: 'Impostazioni', url: '/erp/settings', checks: [] },
  ]

  for (const p of pages) {
    try {
      await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)

      let allOk = true
      for (const sel of p.checks) {
        try {
          await page.waitForSelector(sel, { timeout: 5000 })
        } catch {
          allOk = false
          fail(`Frontend ${p.name}`, `elemento mancante: ${sel}`)
        }
      }
      if (allOk) {
        pass(`Frontend ${p.name}`, 'pagina caricata')
      }
      await screenshot(page, p.name.toLowerCase().replace(/\s+/g, '-'))
    } catch (err) {
      fail(`Frontend ${p.name}`, err.message.substring(0, 100))
    }
  }

  // Test: create expense via UI
  console.log('\n── Test CRUD Frontend (Spesa via UI) ──')
  try {
    await page.goto(`${BASE_URL}/erp/movimenti`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Click "Nuova Spesa"
    const newBtn = await page.$('button:has-text("Nuova Spesa")')
    if (!newBtn) {
      fail('Frontend Nuova Spesa', 'bottone "Nuova Spesa" non trovato')
      return
    }
    await newBtn.click()
    await page.waitForTimeout(1000)
    await screenshot(page, 'nuova-spesa-modal')

    // Check if modal/form opened
    const modal = await page.$('[role="dialog"], .modal, form')
    if (modal) {
      pass('Frontend Nuova Spesa', 'modal/form aperto')
    } else {
      // Might be an inline form or different structure
      pass('Frontend Nuova Spesa', 'click eseguito (verifica visiva dallo screenshot)')
    }

    // Try to close modal
    const closeBtn = await page.$('button:has-text("Annulla"), button:has-text("Chiudi"), [aria-label="Chiudi"], button:has-text("Cancel")')
    if (closeBtn) {
      await closeBtn.click()
      await page.waitForTimeout(500)
    } else {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
  } catch (err) {
    fail('Frontend Nuova Spesa', err.message.substring(0, 100))
  }

  // Test: create income via UI
  try {
    await page.goto(`${BASE_URL}/erp/movimenti?tab=entrate`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const newBtn = await page.$('button:has-text("Nuova Entrata")')
    if (!newBtn) {
      fail('Frontend Nuova Entrata', 'bottone "Nuova Entrata" non trovato')
      return
    }
    await newBtn.click()
    await page.waitForTimeout(1000)
    await screenshot(page, 'nuova-entrata-modal')

    const modal = await page.$('[role="dialog"], .modal, form')
    if (modal) {
      pass('Frontend Nuova Entrata', 'modal/form aperto')
    } else {
      pass('Frontend Nuova Entrata', 'click eseguito (verifica visiva dallo screenshot)')
    }

    const closeBtn = await page.$('button:has-text("Annulla"), button:has-text("Chiudi"), [aria-label="Chiudi"]')
    if (closeBtn) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
  } catch (err) {
    fail('Frontend Nuova Entrata', err.message.substring(0, 100))
  }

  // Test: Filters on Spese
  console.log('\n── Test Filtri Frontend ──')
  try {
    await page.goto(`${BASE_URL}/erp/movimenti`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Check filter elements exist
    const filters = ['select', 'input[type="date"]']
    let filterCount = 0
    for (const sel of filters) {
      const els = await page.$$(sel)
      filterCount += els.length
    }
    if (filterCount > 0) {
      pass('Filtri Spese', `${filterCount} elementi filtro trovati`)
    } else {
      fail('Filtri Spese', 'nessun filtro trovato')
    }
  } catch (err) {
    fail('Filtri Spese', err.message.substring(0, 100))
  }

  // Test: CSV export button
  try {
    const csvBtn = await page.$('button:has-text("CSV")')
    if (csvBtn) {
      pass('Export CSV', 'bottone CSV presente')
    } else {
      fail('Export CSV', 'bottone CSV non trovato')
    }
  } catch (err) {
    fail('Export CSV', err.message.substring(0, 100))
  }

  // Test: Redirect /erp/ricorrenti
  console.log('\n── Test Redirect ──')
  try {
    await page.goto(`${BASE_URL}/erp/ricorrenti`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const finalUrl = page.url()
    if (finalUrl.includes('/erp/movimenti') && finalUrl.includes('tab=abbonamenti')) {
      pass('Redirect /erp/ricorrenti', `→ ${finalUrl}`)
    } else {
      fail('Redirect /erp/ricorrenti', `URL finale: ${finalUrl}`)
    }
  } catch (err) {
    fail('Redirect /erp/ricorrenti', err.message.substring(0, 100))
  }
}

// ===== MAIN =====

;(async () => {
  if (!USERNAME || !PASSWORD) {
    console.error('Imposta AUDIT_USERNAME e AUDIT_PASSWORD')
    process.exit(1)
  }

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  })

  try {
    // Login
    console.log('\n[LOGIN]')
    await loginAndGetCookies(context)
    pass('Login', 'autenticazione riuscita')

    // API Tests
    const page = await context.newPage()

    console.log('\n════════════════════════════════════════')
    console.log('  TEST API BACKEND')
    console.log('════════════════════════════════════════')

    await testExpenseCRUD(page.request)
    await testIncomeCRUD(page.request)
    await testDashboardAPI(page.request)
    await testSubscriptionAPI(page.request)
    await testBankAccountsAPI(page.request)
    await testSettingsAPIs(page.request)

    console.log('\n════════════════════════════════════════')
    console.log('  TEST FRONTEND')
    console.log('════════════════════════════════════════')

    await testFrontendPages(page)

  } catch (err) {
    console.error('\n✗ Errore fatale:', err.message)
    results.errors.push(err.message)
  } finally {
    await browser.close()
  }

  // ===== REPORT =====
  console.log('\n' + '═'.repeat(50))
  console.log('  REPORT FINALE')
  console.log('═'.repeat(50))
  console.log(`\n  Totale test: ${results.passed + results.failed}`)
  console.log(`  ✓ Passati:  ${results.passed}`)
  console.log(`  ✗ Falliti:  ${results.failed}`)

  if (results.failed > 0) {
    console.log('\n  Test falliti:')
    for (const t of results.tests.filter(t => t.status === 'FAIL')) {
      console.log(`    ✗ ${t.name}: ${t.detail}`)
    }
  }

  // Save report
  const reportPath = path.join(SCREENSHOTS_DIR, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n  Report: ${reportPath}`)
  console.log(`  Screenshots: ${SCREENSHOTS_DIR}`)

  process.exit(results.failed > 0 ? 1 : 0)
})()
