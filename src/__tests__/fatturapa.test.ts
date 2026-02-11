import { describe, it, expect } from 'vitest'
import { validateFatturaPA, generateFatturaPA } from '@/lib/fatturapa'
import type { GenerateFatturaPAParams } from '@/lib/fatturapa'

// --- Test fixtures ---

function makeValidParams(overrides?: Partial<GenerateFatturaPAParams>): GenerateFatturaPAParams {
  return {
    company: {
      ragioneSociale: 'FODI SRL',
      partitaIva: '12345678901',
      codiceFiscale: '12345678901',
      indirizzo: 'Via Roma 1',
      cap: '00100',
      citta: 'Roma',
      provincia: 'RM',
      nazione: 'IT',
      regimeFiscale: 'RF01',
      iban: 'IT60X0542811101000000123456',
      pec: 'fodi@pec.it',
      telefono: '+390612345678',
      email: 'info@fodisrl.it',
    },
    client: {
      companyName: 'Cliente Test SRL',
      vatNumber: '98765432109',
      fiscalCode: 'RSSMRA80A01H501Z',
      pec: 'cliente@pec.it',
      sdi: 'M5UXCR1',
    },
    invoice: {
      number: 'FT-2026/001',
      issuedDate: '2026-01-15',
      dueDate: '2026-02-15',
      subtotal: '1000.00',
      taxRate: '22',
      taxAmount: '220.00',
      total: '1220.00',
      discount: '0',
      notes: 'Test fattura',
      paymentMethod: 'bonifico',
    },
    lineItems: [
      {
        description: 'Servizio di consulenza',
        quantity: 10,
        unitPrice: '50.00',
        total: '500.00',
        sortOrder: 1,
      },
      {
        description: 'Sviluppo software',
        quantity: 5,
        unitPrice: '100.00',
        total: '500.00',
        sortOrder: 2,
      },
    ],
    ...overrides,
  }
}

// --- Validation tests ---

describe('FatturaPA - validateFatturaPA', () => {
  it('restituisce array vuoto per dati validi', () => {
    const errors = validateFatturaPA(makeValidParams())
    expect(errors).toHaveLength(0)
  })

  it('errore se manca P.IVA cedente', () => {
    const params = makeValidParams()
    params.company.partitaIva = ''
    const errors = validateFatturaPA(params)
    expect(errors).toContainEqual({
      field: 'company.partitaIva',
      message: 'P.IVA cedente obbligatoria',
    })
  })

  it('errore se manca ragione sociale', () => {
    const params = makeValidParams()
    params.company.ragioneSociale = ''
    const errors = validateFatturaPA(params)
    expect(errors).toContainEqual({
      field: 'company.ragioneSociale',
      message: 'Ragione sociale cedente obbligatoria',
    })
  })

  it('errore se mancano sia P.IVA che codice fiscale del cliente', () => {
    const params = makeValidParams()
    params.client.vatNumber = null
    params.client.fiscalCode = null
    const errors = validateFatturaPA(params)
    expect(errors).toContainEqual({
      field: 'client.vatNumber',
      message: 'P.IVA o Codice Fiscale cessionario obbligatorio',
    })
  })

  it('nessun errore se il cliente ha solo P.IVA (no codice fiscale)', () => {
    const params = makeValidParams()
    params.client.fiscalCode = null
    const errors = validateFatturaPA(params)
    expect(errors).toHaveLength(0)
  })

  it('nessun errore se il cliente ha solo codice fiscale (no P.IVA)', () => {
    const params = makeValidParams()
    params.client.vatNumber = null
    const errors = validateFatturaPA(params)
    expect(errors).toHaveLength(0)
  })

  it('errore se lineItems e vuoto', () => {
    const params = makeValidParams({ lineItems: [] })
    const errors = validateFatturaPA(params)
    expect(errors).toContainEqual({
      field: 'lineItems',
      message: 'Almeno una voce fattura obbligatoria',
    })
  })

  it('puo restituire errori multipli contemporaneamente', () => {
    const params = makeValidParams({ lineItems: [] })
    params.company.partitaIva = ''
    params.company.ragioneSociale = ''
    params.client.vatNumber = null
    params.client.fiscalCode = null
    const errors = validateFatturaPA(params)
    expect(errors).toHaveLength(4)
  })
})

// --- XML generation tests ---

describe('FatturaPA - generateFatturaPA', () => {
  it('genera XML valido con intestazione corretta', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<p:FatturaElettronica versione="FPR12"')
    expect(xml).toContain('xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"')
  })

  it('contiene dati cedente prestatore (company)', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<CedentePrestatore>')
    expect(xml).toContain('<IdPaese>IT</IdPaese>')
    expect(xml).toContain('<IdCodice>12345678901</IdCodice>')
    expect(xml).toContain('<Denominazione>FODI SRL</Denominazione>')
    expect(xml).toContain('<RegimeFiscale>RF01</RegimeFiscale>')
    expect(xml).toContain('<CodiceFiscale>12345678901</CodiceFiscale>')
    expect(xml).toContain('<Indirizzo>Via Roma 1</Indirizzo>')
    expect(xml).toContain('<CAP>00100</CAP>')
    expect(xml).toContain('<Comune>Roma</Comune>')
    expect(xml).toContain('<Provincia>RM</Provincia>')
  })

  it('contiene dati cessionario committente (client)', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<CessionarioCommittente>')
    expect(xml).toContain('<IdCodice>98765432109</IdCodice>')
    expect(xml).toContain('<CodiceFiscale>RSSMRA80A01H501Z</CodiceFiscale>')
    expect(xml).toContain('<Denominazione>Cliente Test SRL</Denominazione>')
  })

  it('contiene dati trasmissione con SDI', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<DatiTrasmissione>')
    expect(xml).toContain('<CodiceDestinatario>M5UXCR1</CodiceDestinatario>')
    expect(xml).toContain('<FormatoTrasmissione>FPR12</FormatoTrasmissione>')
    // Progressivo invio: FT-2026/001 -> FT2026001
    expect(xml).toContain('<ProgressivoInvio>FT2026001</ProgressivoInvio>')
  })

  it('usa 0000000 come codice destinatario se manca SDI', () => {
    const params = makeValidParams()
    params.client.sdi = null
    const xml = generateFatturaPA(params)
    expect(xml).toContain('<CodiceDestinatario>0000000</CodiceDestinatario>')
  })

  it('aggiunge PECDestinatario quando SDI e 0000000 e PEC presente', () => {
    const params = makeValidParams()
    params.client.sdi = null
    params.client.pec = 'cliente@pec.it'
    const xml = generateFatturaPA(params)
    expect(xml).toContain('<PECDestinatario>cliente@pec.it</PECDestinatario>')
  })

  it('NON aggiunge PECDestinatario quando SDI e valorizzato', () => {
    const params = makeValidParams()
    // SDI is 'M5UXCR1' by default
    const xml = generateFatturaPA(params)
    expect(xml).not.toContain('<PECDestinatario>')
  })

  it('contiene dati generali documento', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<TipoDocumento>TD01</TipoDocumento>')
    expect(xml).toContain('<Divisa>EUR</Divisa>')
    expect(xml).toContain('<Data>2026-01-15</Data>')
    expect(xml).toContain('<Numero>FT-2026/001</Numero>')
    expect(xml).toContain('<ImportoTotaleDocumento>1220.00</ImportoTotaleDocumento>')
  })

  it('contiene dettaglio linee con ordine corretto', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<DettaglioLinee>')
    expect(xml).toContain('<NumeroLinea>1</NumeroLinea>')
    expect(xml).toContain('<Descrizione>Servizio di consulenza</Descrizione>')
    expect(xml).toContain('<Quantita>10.00</Quantita>')
    expect(xml).toContain('<PrezzoUnitario>50.00</PrezzoUnitario>')
    expect(xml).toContain('<PrezzoTotale>500.00</PrezzoTotale>')

    expect(xml).toContain('<NumeroLinea>2</NumeroLinea>')
    expect(xml).toContain('<Descrizione>Sviluppo software</Descrizione>')
    expect(xml).toContain('<Quantita>5.00</Quantita>')
    expect(xml).toContain('<PrezzoUnitario>100.00</PrezzoUnitario>')
  })

  it('ordina linee per sortOrder (non per ordine di inserimento)', () => {
    const params = makeValidParams({
      lineItems: [
        { description: 'Secondo', quantity: 1, unitPrice: '100', total: '100', sortOrder: 2 },
        { description: 'Primo', quantity: 1, unitPrice: '50', total: '50', sortOrder: 1 },
      ],
    })
    const xml = generateFatturaPA(params)
    const firstIdx = xml.indexOf('<Descrizione>Primo</Descrizione>')
    const secondIdx = xml.indexOf('<Descrizione>Secondo</Descrizione>')
    expect(firstIdx).toBeLessThan(secondIdx)
  })

  it('contiene aliquota IVA su ogni riga', () => {
    const xml = generateFatturaPA(makeValidParams())
    // 22% tax rate
    const matches = xml.match(/<AliquotaIVA>22\.00<\/AliquotaIVA>/g)
    // 2 linee + 1 riepilogo = 3 occorrenze
    expect(matches).toHaveLength(3)
  })

  it('contiene dati riepilogo IVA', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<DatiRiepilogo>')
    expect(xml).toContain('<ImponibileImporto>1000.00</ImponibileImporto>')
    expect(xml).toContain('<Imposta>220.00</Imposta>')
    expect(xml).toContain('<EsigibilitaIVA>I</EsigibilitaIVA>')
  })

  it('contiene dati pagamento con IBAN', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<DatiPagamento>')
    expect(xml).toContain('<CondizioniPagamento>TP02</CondizioniPagamento>')
    expect(xml).toContain('<ModalitaPagamento>MP05</ModalitaPagamento>')
    expect(xml).toContain('<ImportoPagamento>1220.00</ImportoPagamento>')
    expect(xml).toContain('<DataScadenzaPagamento>2026-02-15</DataScadenzaPagamento>')
    expect(xml).toContain('<IBAN>IT60X0542811101000000123456</IBAN>')
  })

  it('omette IBAN se non presente', () => {
    const params = makeValidParams()
    params.company.iban = null
    const xml = generateFatturaPA(params)
    expect(xml).not.toContain('<IBAN>')
  })

  it('omette DataScadenzaPagamento se dueDate non presente', () => {
    const params = makeValidParams()
    params.invoice.dueDate = null
    const xml = generateFatturaPA(params)
    expect(xml).not.toContain('<DataScadenzaPagamento>')
  })

  it('include ScontoMaggiorazione se discount > 0', () => {
    const params = makeValidParams()
    params.invoice.discount = '100.00'
    const xml = generateFatturaPA(params)
    expect(xml).toContain('<ScontoMaggiorazione>')
    expect(xml).toContain('<Tipo>SC</Tipo>')
    expect(xml).toContain('<Importo>100.00</Importo>')
  })

  it('NON include ScontoMaggiorazione se discount e 0', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).not.toContain('<ScontoMaggiorazione>')
  })

  it('calcola imponibile corretto con sconto', () => {
    const params = makeValidParams()
    params.invoice.subtotal = '1000.00'
    params.invoice.discount = '200.00'
    const xml = generateFatturaPA(params)
    // ImponibileImporto = subtotal - discount = 800.00
    expect(xml).toContain('<ImponibileImporto>800.00</ImponibileImporto>')
  })

  it('contiene contatti cedente (telefono ed email)', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<Contatti>')
    expect(xml).toContain('<Telefono>+390612345678</Telefono>')
    expect(xml).toContain('<Email>info@fodisrl.it</Email>')
  })

  it('omette contatti se telefono e email sono null', () => {
    const params = makeValidParams()
    params.company.telefono = null
    params.company.email = null
    const xml = generateFatturaPA(params)
    expect(xml).not.toContain('<Contatti>')
  })

  it('omette CodiceFiscale cedente se non presente', () => {
    const params = makeValidParams()
    params.company.codiceFiscale = null
    const xml = generateFatturaPA(params)
    // Verifica che non ci sia CodiceFiscale nel blocco CedentePrestatore
    const cedenteSection = xml.split('<CedentePrestatore>')[1].split('</CedentePrestatore>')[0]
    expect(cedenteSection).not.toContain('<CodiceFiscale>')
  })

  it('omette IdFiscaleIVA cliente se vatNumber non presente', () => {
    const params = makeValidParams()
    params.client.vatNumber = null
    const xml = generateFatturaPA(params)
    const cessionarioSection = xml.split('<CessionarioCommittente>')[1].split('</CessionarioCommittente>')[0]
    expect(cessionarioSection).not.toContain('<IdFiscaleIVA>')
  })
})

// --- XML escaping tests ---

describe('FatturaPA - escape XML nelle descrizioni', () => {
  it('escape caratteri speciali nelle descrizioni delle linee', () => {
    const params = makeValidParams({
      lineItems: [
        {
          description: 'Servizio "A" & <B> per l\'azienda',
          quantity: 1,
          unitPrice: '100',
          total: '100',
          sortOrder: 1,
        },
      ],
    })
    const xml = generateFatturaPA(params)
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;B&gt;')
    expect(xml).toContain('&quot;A&quot;')
    expect(xml).toContain('&apos;')
  })

  it('escape caratteri speciali nel nome azienda cliente', () => {
    const params = makeValidParams()
    params.client.companyName = 'D&G "Fashion" <Test>'
    const xml = generateFatturaPA(params)
    expect(xml).toContain('D&amp;G &quot;Fashion&quot; &lt;Test&gt;')
  })
})

// --- Numeric formatting tests ---

describe('FatturaPA - formatAmount e conversioni numeriche', () => {
  it('gestisce importi come stringhe', () => {
    const params = makeValidParams()
    params.invoice.total = '1220.50'
    const xml = generateFatturaPA(params)
    expect(xml).toContain('<ImportoTotaleDocumento>1220.50</ImportoTotaleDocumento>')
    expect(xml).toContain('<ImportoPagamento>1220.50</ImportoPagamento>')
  })

  it('gestisce importi come numeri', () => {
    const params = makeValidParams()
    params.invoice.total = 1220.50
    const xml = generateFatturaPA(params)
    expect(xml).toContain('<ImportoTotaleDocumento>1220.50</ImportoTotaleDocumento>')
  })

  it('formatta a 2 decimali', () => {
    const params = makeValidParams()
    params.invoice.total = '1000'
    const xml = generateFatturaPA(params)
    expect(xml).toContain('<ImportoTotaleDocumento>1000.00</ImportoTotaleDocumento>')
  })

  it('gestisce quantita come intero nel formato fisso', () => {
    const xml = generateFatturaPA(makeValidParams())
    expect(xml).toContain('<Quantita>10.00</Quantita>')
    expect(xml).toContain('<Quantita>5.00</Quantita>')
  })

  it('usa data corrente se issuedDate e null', () => {
    const params = makeValidParams()
    params.invoice.issuedDate = null
    const xml = generateFatturaPA(params)
    const today = new Date().toISOString().split('T')[0]
    expect(xml).toContain(`<Data>${today}</Data>`)
  })
})
