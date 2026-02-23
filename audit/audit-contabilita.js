/**
 * Audit Contabilità — Muscari OS
 * Playwright script per verificare tutte le sezioni ERP/Contabilità
 *
 * Uso: node audit/audit-contabilita.js
 * Richiede: AUDIT_USERNAME e AUDIT_PASSWORD in env (o .env nel progetto)
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://os.pieromuscari.it'
const USERNAME = process.env.AUDIT_USERNAME
const PASSWORD = process.env.AUDIT_PASSWORD
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'contabilita')
const TIMEOUT = 15_000

// Results collector
const results = {
  pages: [],
  consoleErrors: [],
  bugs: [],
  pendingInvoicesCheck: null,
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

async function collectConsoleErrors(page, pageName) {
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ page: pageName, text: msg.text() })
    }
  })
  page.on('pageerror', err => {
    errors.push({ page: pageName, text: err.message })
  })
  return errors
}

// ===== LOGIN =====

async function login(page) {
  console.log('\n[1/12] Login...')
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })

  await page.fill('#username', USERNAME)
  await page.fill('#password', PASSWORD)

  // Intercept the login API response
  const [loginResponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 15_000 }),
    page.click('button[type="submit"]'),
  ])

  const loginStatus = loginResponse.status()
  console.log(`  Login API status: ${loginStatus}`)

  if (loginStatus === 401) {
    await screenshot(page, '00a-login-failed')
    throw new Error('Login fallito: credenziali non valide (401)')
  }

  if (loginStatus === 403) {
    // OTP required
    console.log('  ⚠ Richiesta verifica IP (OTP).')
    await page.waitForURL('**/verify-ip', { timeout: 5_000 }).catch(() => {})
    await screenshot(page, '00a-otp-required')
    console.log('    Attendere inserimento manuale OTP nella pagina del browser...')
    await page.waitForURL('**/dashboard', { timeout: 180_000 })
    console.log('  ✓ Login riuscito dopo verifica IP')
  } else if (loginStatus === 200) {
    try {
      await page.waitForURL('**/dashboard', { timeout: 15_000 })
      console.log('  ✓ Login riuscito')
    } catch {
      await screenshot(page, '00a-login-redirect-failed')
      throw new Error('Login OK ma redirect a dashboard fallito. URL: ' + page.url())
    }
  } else {
    throw new Error(`Login fallito con status ${loginStatus}`)
  }

  await screenshot(page, '00-dashboard-post-login')
}

// ===== PAGE TESTER =====

async function testPage(page, { name, url, expectedElements, testFn }) {
  const pageResult = { name, url, status: 'OK', errors: [], screenshots: [] }

  try {
    // Navigate
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })
    await page.waitForTimeout(3000) // Let dynamic content render

    // Check for visible errors
    const errorBanners = await page.$$('text=/[Ee]rrore/')
    if (errorBanners.length > 0) {
      const texts = await Promise.all(errorBanners.map(el => el.textContent()))
      // Filter out false positives (e.g. "Errore" as a label in forms is OK)
      const realErrors = texts.filter(t =>
        t && !t.includes('Gestione Errore') && t.length < 200
      )
      if (realErrors.length > 0) {
        pageResult.errors.push(`Testi errore visibili: ${realErrors.join('; ')}`)
      }
    }

    // Check expected elements
    if (expectedElements) {
      for (const sel of expectedElements) {
        try {
          await page.waitForSelector(sel, { timeout: 5000 })
        } catch {
          pageResult.errors.push(`Elemento mancante: ${sel}`)
        }
      }
    }

    // Run custom test
    if (testFn) {
      await testFn(page, pageResult)
    }

    // Screenshot
    const ssPath = await screenshot(page, name)
    pageResult.screenshots.push(ssPath)

    if (pageResult.errors.length > 0) {
      pageResult.status = 'WARNING'
    }
  } catch (err) {
    pageResult.status = 'ERROR'
    pageResult.errors.push(err.message)
    try { await screenshot(page, `${name}-error`) } catch {}
  }

  results.pages.push(pageResult)
  const icon = pageResult.status === 'OK' ? '✓' : pageResult.status === 'WARNING' ? '⚠' : '✗'
  console.log(`  ${icon} ${name} — ${pageResult.status}${pageResult.errors.length ? ` (${pageResult.errors.length} issues)` : ''}`)
  return pageResult
}

// ===== MAIN =====

;(async () => {
  if (!USERNAME || !PASSWORD) {
    console.error('Imposta AUDIT_USERNAME e AUDIT_PASSWORD come variabili d\'ambiente')
    process.exit(1)
  }

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  })

  // Collect console errors globally
  const consoleErrors = []
  context.on('page', p => {
    p.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push({ url: p.url(), text: msg.text() })
    })
    p.on('pageerror', err => consoleErrors.push({ url: p.url(), text: err.message }))
  })

  const page = await context.newPage()

  try {
    await login(page)

    // === PANORAMICA MENSILE ===
    console.log('\n[2/12] Panoramica Mensile...')
    await testPage(page, {
      name: '01-panoramica-mensile',
      url: '/erp/panoramica',
      expectedElements: [
        'text=Entrate Lorde',
        'text=Spese Lorde',
        'text=Profitto Netto',
        'text=IVA Netta',
      ],
      testFn: async (p, result) => {
        // Test pending invoices total
        const hasPending = await p.$('text=Fatture in Attesa di Pagamento')
        if (hasPending) {
          // Get all row amounts
          const rows = await p.$$('table tfoot ~ tbody tr, table tbody tr')
          const amounts = []
          const cells = await p.$$('table tbody tr td:last-child')
          for (const cell of cells) {
            const text = await cell.textContent()
            // Parse currency: "€ 1.234,56" or "1.234,56 €"
            const cleaned = text.replace(/[€\s.]/g, '').replace(',', '.')
            const num = parseFloat(cleaned)
            if (!isNaN(num)) amounts.push(num)
          }

          // Get footer total
          const footerCell = await p.$('table tfoot td:last-child')
          if (footerCell) {
            const footerText = await footerCell.textContent()
            const cleanedTotal = footerText.replace(/[€\s.]/g, '').replace(',', '.')
            const displayedTotal = parseFloat(cleanedTotal)

            const manualSum = amounts.reduce((s, a) => s + a, 0)

            results.pendingInvoicesCheck = {
              rowAmounts: amounts,
              manualSum: Math.round(manualSum * 100) / 100,
              displayedTotal: Math.round(displayedTotal * 100) / 100,
              match: Math.abs(manualSum - displayedTotal) < 0.02,
              isNaN: isNaN(displayedTotal),
              isStringConcat: String(displayedTotal).length > 15,
            }

            if (isNaN(displayedTotal)) {
              result.errors.push('BUG: Totale Fatture in Attesa è NaN')
              results.bugs.push({
                severity: 'HIGH',
                page: 'Panoramica Mensile',
                description: 'Totale "Fatture in Attesa" mostra NaN — probabile concatenazione stringhe Decimal',
              })
            } else if (!results.pendingInvoicesCheck.match) {
              result.errors.push(
                `BUG: Totale Fatture in Attesa (${displayedTotal}) non corrisponde alla somma righe (${Math.round(manualSum * 100) / 100})`
              )
              results.bugs.push({
                severity: 'MEDIUM',
                page: 'Panoramica Mensile',
                description: `Totale in sospeso (${displayedTotal}) ≠ somma righe (${Math.round(manualSum * 100) / 100})`,
              })
            }
          }
        } else {
          results.pendingInvoicesCheck = { noPendingInvoices: true }
        }
      },
    })

    // === PANORAMICA ANNUALE ===
    console.log('\n[3/12] Panoramica Annuale...')
    await testPage(page, {
      name: '02-panoramica-annuale',
      url: '/erp/panoramica?tab=annuale',
      expectedElements: [],
    })

    // === PANORAMICA STATISTICHE ===
    console.log('\n[4/12] Panoramica Statistiche...')
    await testPage(page, {
      name: '03-panoramica-statistiche',
      url: '/erp/panoramica?tab=statistiche',
      expectedElements: [],
    })

    // === SPESE ===
    console.log('\n[5/12] Movimenti > Spese...')
    await testPage(page, {
      name: '04-movimenti-spese',
      url: '/erp/movimenti',
      expectedElements: ['text=Spese'],
      testFn: async (p) => {
        // Verify tab bar has 5 tabs now
        const tabButtons = await p.$$('button:has-text("Spese"), button:has-text("Entrate"), button:has-text("Prima Nota"), button:has-text("Abbonamenti"), button:has-text("Fatture Ricorrenti")')
        if (tabButtons.length < 5) {
          results.bugs.push({
            severity: 'MEDIUM',
            page: 'Movimenti',
            description: `Tab bar ha ${tabButtons.length} tab invece di 5`,
          })
        }
      },
    })

    // === ENTRATE ===
    console.log('\n[6/12] Movimenti > Entrate...')
    await testPage(page, {
      name: '05-movimenti-entrate',
      url: '/erp/movimenti?tab=entrate',
      expectedElements: ['text=Entrate'],
    })

    // === PRIMA NOTA ===
    console.log('\n[7/12] Movimenti > Prima Nota...')
    await testPage(page, {
      name: '06-movimenti-prima-nota',
      url: '/erp/movimenti?tab=prima-nota',
      expectedElements: [],
    })

    // === ABBONAMENTI (new tab in Movimenti) ===
    console.log('\n[8/12] Movimenti > Abbonamenti...')
    await testPage(page, {
      name: '07-movimenti-abbonamenti',
      url: '/erp/movimenti?tab=abbonamenti',
      expectedElements: [],
    })

    // === FATTURE RICORRENTI (new tab in Movimenti) ===
    console.log('\n[9/12] Movimenti > Fatture Ricorrenti...')
    await testPage(page, {
      name: '08-movimenti-fatture-ricorrenti',
      url: '/erp/movimenti?tab=fatture-ricorrenti',
      expectedElements: [],
    })

    // === CONTI BANCARI ===
    console.log('\n[10/12] Conti Bancari...')
    await testPage(page, {
      name: '09-conti-bancari',
      url: '/erp/accounts',
      expectedElements: [],
    })

    // === IMPOSTAZIONI ERP ===
    console.log('\n[11/12] Impostazioni ERP...')
    await testPage(page, {
      name: '10-impostazioni-erp',
      url: '/erp/settings',
      expectedElements: [],
    })

    // === REDIRECT TEST: /erp/ricorrenti → /erp/movimenti?tab=abbonamenti ===
    console.log('\n[12/12] Redirect /erp/ricorrenti...')
    await page.goto(`${BASE_URL}/erp/ricorrenti`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })
    await page.waitForTimeout(1500)
    const finalUrl = page.url()
    const redirectOk = finalUrl.includes('/erp/movimenti') && finalUrl.includes('tab=abbonamenti')
    results.pages.push({
      name: 'redirect-ricorrenti',
      url: '/erp/ricorrenti',
      status: redirectOk ? 'OK' : 'ERROR',
      errors: redirectOk ? [] : [`Redirect non funzionante. URL finale: ${finalUrl}`],
      screenshots: [],
    })
    console.log(`  ${redirectOk ? '✓' : '✗'} Redirect ricorrenti → movimenti?tab=abbonamenti`)

  } catch (err) {
    console.error('\n✗ Errore fatale:', err.message)
    results.fatalError = err.message
  } finally {
    await browser.close()
  }

  // Collect console errors
  results.consoleErrors = consoleErrors

  // === REPORT ===
  console.log('\n' + '='.repeat(60))
  console.log('REPORT AUDIT CONTABILITÀ')
  console.log('='.repeat(60))

  const ok = results.pages.filter(p => p.status === 'OK').length
  const warn = results.pages.filter(p => p.status === 'WARNING').length
  const err = results.pages.filter(p => p.status === 'ERROR').length

  console.log(`\nPagine testate: ${results.pages.length}`)
  console.log(`  ✓ OK: ${ok}`)
  console.log(`  ⚠ Warning: ${warn}`)
  console.log(`  ✗ Errore: ${err}`)

  if (results.bugs.length > 0) {
    console.log(`\nBug trovati: ${results.bugs.length}`)
    for (const bug of results.bugs) {
      console.log(`  [${bug.severity}] ${bug.page}: ${bug.description}`)
    }
  }

  if (results.pendingInvoicesCheck) {
    console.log('\nCheck "Fatture in Attesa di Pagamento":')
    if (results.pendingInvoicesCheck.noPendingInvoices) {
      console.log('  ℹ Nessuna fattura in attesa nel periodo corrente')
    } else {
      console.log(`  Somma righe: ${results.pendingInvoicesCheck.manualSum}`)
      console.log(`  Totale mostrato: ${results.pendingInvoicesCheck.displayedTotal}`)
      console.log(`  Corrispondono: ${results.pendingInvoicesCheck.match ? 'SI' : 'NO'}`)
      console.log(`  È NaN: ${results.pendingInvoicesCheck.isNaN ? 'SI (BUG!)' : 'NO'}`)
    }
  }

  if (consoleErrors.length > 0) {
    console.log(`\nErrori console JS: ${consoleErrors.length}`)
    // Show unique errors
    const unique = [...new Set(consoleErrors.map(e => e.text))]
    for (const e of unique.slice(0, 10)) {
      console.log(`  • ${e.substring(0, 120)}`)
    }
    if (unique.length > 10) console.log(`  ... e altri ${unique.length - 10}`)
  }

  // Save full report as JSON
  const reportPath = path.join(__dirname, 'screenshots', 'contabilita', `report-${timestamp()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\nReport completo salvato in: ${reportPath}`)
  console.log('Screenshots in: ' + SCREENSHOTS_DIR)

  // Exit code
  process.exit(err > 0 || results.fatalError ? 1 : 0)
})()
