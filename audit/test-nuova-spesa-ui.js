/**
 * Test creazione nuova spesa tramite UI — Muscari OS
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE = process.env.AUDIT_BASE_URL || 'https://os.pieromuscari.it'
const USER = process.env.AUDIT_USERNAME
const PASS = process.env.AUDIT_PASSWORD
const SSDIR = path.join(__dirname, 'screenshots', 'test-nuova-spesa')
fs.mkdirSync(SSDIR, { recursive: true })

async function ss(page, name) {
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: true })
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()

  // === LOGIN ===
  console.log('[1] Login...')
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#username', USER)
  await page.fill('#password', PASS)
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ])
  if (resp.status() === 403) {
    console.log('  OTP richiesto, attesa...')
    await page.waitForURL('**/dashboard', { timeout: 180000 })
  } else {
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  }
  console.log('  OK')

  // === NAVIGA A SPESE ===
  console.log('\n[2] Navigazione a /erp/movimenti...')
  await page.goto(`${BASE}/erp/movimenti`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await ss(page, '01-spese-lista')

  // === CLICK NUOVA SPESA ===
  console.log('\n[3] Click su "Nuova Spesa"...')
  const newBtn = page.locator('button', { hasText: 'Nuova Spesa' })
  await newBtn.click()
  await page.waitForTimeout(1500)
  await ss(page, '02-modal-aperto')

  // === ANALISI CAMPI FORM ===
  console.log('\n[4] Analisi campi del form...')

  // Find all form elements inside the dialog/modal/drawer
  const formContainer = await page.$('[role="dialog"]') || await page.$('.modal') || await page.$('form')
  const containerSel = formContainer ? (await formContainer.evaluate(el => {
    if (el.getAttribute('role') === 'dialog') return '[role="dialog"]'
    if (el.classList.contains('modal')) return '.modal'
    return 'form'
  })) : 'body'

  console.log(`  Container: ${containerSel}`)

  // Get all labels
  const labels = await page.$$eval(`${containerSel} label`, els =>
    els.map(el => ({
      text: el.textContent?.trim(),
      for: el.getAttribute('for') || '',
      hasInput: !!el.querySelector('input, select, textarea'),
    }))
  )
  console.log(`  Labels trovate: ${labels.length}`)
  for (const l of labels) {
    console.log(`    - "${l.text}" (for=${l.for})`)
  }

  // Get all inputs/selects
  const fields = await page.$$eval(`${containerSel} input, ${containerSel} select, ${containerSel} textarea`, els =>
    els.map(el => ({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      required: el.required,
      value: el.value || '',
    }))
  )
  console.log(`\n  Campi input: ${fields.length}`)
  for (const f of fields) {
    console.log(`    ${f.tag}[type=${f.type}] name="${f.name}" id="${f.id}" placeholder="${f.placeholder}" ${f.required ? 'REQUIRED' : ''} value="${f.value}"`)
  }

  // Get all buttons
  const buttons = await page.$$eval(`${containerSel} button`, els =>
    els.map(el => ({
      text: el.textContent?.trim(),
      type: el.type || '',
      disabled: el.disabled,
    }))
  )
  console.log(`\n  Bottoni: ${buttons.length}`)
  for (const b of buttons) {
    console.log(`    [${b.type}] "${b.text}" ${b.disabled ? 'DISABLED' : ''}`)
  }

  // === COMPILAZIONE FORM ===
  console.log('\n[5] Compilazione form...')

  // Use the form locator for all fills to avoid matching elements outside the modal
  const form = page.locator(`${containerSel} form`).first()
  const formEl = (await form.count()) > 0 ? form : page.locator(containerSel).first()

  // Fill required fields first with explicit locators
  const fieldMap = {
    supplierName: 'Fornitore Test Audit',
    description: 'Test spesa audit automatico',
    amount: '99.99',
  }

  for (const [name, value] of Object.entries(fieldMap)) {
    try {
      const input = formEl.locator(`input[name="${name}"]`).first()
      await input.fill(value, { timeout: 3000 })
      console.log(`  ✓ ${name}: "${value}"`)
    } catch (e) {
      // Fallback: try nth match
      try {
        const all = page.locator(`input[name="${name}"]`)
        const count = await all.count()
        console.log(`  ⚠ ${name}: trovati ${count} elementi, provo ultimo...`)
        if (count > 0) {
          await all.nth(count - 1).fill(value, { timeout: 3000 })
          console.log(`  ✓ ${name}: compilato (nth=${count - 1})`)
        }
      } catch (e2) {
        console.log(`  ✗ ${name}: ${e2.message.substring(0, 80)}`)
      }
    }
  }

  // Date
  try {
    const dateInput = formEl.locator('input[name="date"]').first()
    await dateInput.fill('2026-02-23', { timeout: 3000 })
    console.log('  ✓ date: 2026-02-23')
  } catch (e) {
    console.log(`  ✗ date: ${e.message.substring(0, 80)}`)
  }

  // Category select
  try {
    const catSel = formEl.locator('select[name="category"]').first()
    await catSel.selectOption({ index: 1 }, { timeout: 3000 })
    const selected = await catSel.inputValue()
    console.log(`  ✓ category: "${selected}"`)
  } catch (e) {
    console.log(`  ✗ category: ${e.message.substring(0, 80)}`)
  }

  await page.waitForTimeout(500)
  await ss(page, '03-form-compilato')

  // === SUBMIT ===
  console.log('\n[6] Submit...')
  const submitBtn = page.locator(`${containerSel} button[type="submit"]`).first()
    || page.locator(`${containerSel} button`, { hasText: /salva|crea|registra|aggiungi/i }).first()

  const submitText = await submitBtn.textContent().catch(() => 'N/A')
  console.log(`  Bottone: "${submitText.trim()}"`)

  // Intercept API
  const apiPromise = page.waitForResponse(
    r => r.url().includes('/api/expenses') && r.request().method() === 'POST',
    { timeout: 10000 }
  ).catch(() => null)

  await submitBtn.click()
  await page.waitForTimeout(2000)

  const apiResp = await apiPromise
  await ss(page, '04-dopo-submit')

  if (apiResp) {
    const status = apiResp.status()
    const body = await apiResp.json().catch(() => null)
    console.log(`\n  API Response: ${status}`)
    console.log(`  Body: ${JSON.stringify(body).substring(0, 500)}`)

    if (status === 201 && body?.success) {
      console.log('\n  ✓ SPESA CREATA CON SUCCESSO!')
      console.log(`    ID: ${body.data.id}`)
      console.log(`    Importo: ${body.data.amount}`)
      console.log(`    Categoria: ${body.data.category}`)
      console.log(`    Descrizione: ${body.data.description}`)
      console.log(`    Data: ${body.data.date}`)
      console.log(`    IVA netta: ${body.data.netAmount}`)
      console.log(`    IVA detraibile: ${body.data.vatDeductible}`)

      // Wait and check if it appears in the list
      await page.waitForTimeout(2000)
      await ss(page, '05-spesa-nella-lista')

      // Cleanup
      console.log('\n  Cleanup: eliminazione spesa di test...')
      const delResp = await page.request.delete(`${BASE}/api/expenses/${body.data.id}`)
      console.log(`    DELETE status: ${delResp.status()}`)
    } else if (status === 400) {
      console.log('\n  ✗ ERRORE VALIDAZIONE (400)')
      console.log(`    Dettagli: ${JSON.stringify(body?.details || body?.error)}`)
    } else {
      console.log(`\n  ✗ ERRORE (${status})`)
    }
  } else {
    console.log('\n  Nessuna chiamata POST /api/expenses intercettata')

    // Check for client-side validation errors
    const errors = await page.$$eval('.text-destructive, .text-red-500, [role="alert"], .error', els =>
      els.map(e => e.textContent?.trim()).filter(Boolean)
    )
    if (errors.length > 0) {
      console.log('  Errori validazione frontend:')
      for (const e of errors) console.log(`    - ${e}`)
    }

    await ss(page, '04b-errori-validazione')
  }

  await browser.close()
  console.log('\nDone.')
})()
