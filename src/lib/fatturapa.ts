/**
 * FatturaPA XML Generator - Formato v1.2.3
 * Genera XML conforme allo standard SDI per fatturazione elettronica italiana.
 */

interface CompanyData {
  ragioneSociale: string
  partitaIva: string
  codiceFiscale?: string | null
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  nazione: string
  regimeFiscale: string
  iban?: string | null
  pec?: string | null
  telefono?: string | null
  email?: string | null
}

interface ClientData {
  companyName: string
  vatNumber?: string | null
  fiscalCode?: string | null
  pec?: string | null
  sdi?: string | null
}

interface LineItemData {
  description: string
  quantity: number
  unitPrice: string | number
  total: string | number
  sortOrder: number
}

interface InvoiceData {
  number: string
  issuedDate: string | null
  dueDate: string | null
  subtotal: string | number
  taxRate: string | number
  taxAmount: string | number
  total: string | number
  discount: string | number
  notes?: string | null
  paymentMethod?: string | null
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatAmount(value: string | number): string {
  return parseFloat(String(value)).toFixed(2)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  return new Date(dateStr).toISOString().split('T')[0]
}

export interface GenerateFatturaPAParams {
  invoice: InvoiceData
  client: ClientData
  company: CompanyData
  lineItems: LineItemData[]
}

export interface FatturaPAValidationError {
  field: string
  message: string
}

export function validateFatturaPA(params: GenerateFatturaPAParams): FatturaPAValidationError[] {
  const errors: FatturaPAValidationError[] = []

  if (!params.company.partitaIva) {
    errors.push({ field: 'company.partitaIva', message: 'P.IVA cedente obbligatoria' })
  }
  if (!params.company.ragioneSociale) {
    errors.push({ field: 'company.ragioneSociale', message: 'Ragione sociale cedente obbligatoria' })
  }
  if (!params.client.vatNumber && !params.client.fiscalCode) {
    errors.push({ field: 'client.vatNumber', message: 'P.IVA o Codice Fiscale cessionario obbligatorio' })
  }
  if (params.lineItems.length === 0) {
    errors.push({ field: 'lineItems', message: 'Almeno una voce fattura obbligatoria' })
  }

  return errors
}

export function generateFatturaPA(params: GenerateFatturaPAParams): string {
  const { invoice, client, company, lineItems } = params

  const codiceDestinatario = client.sdi || '0000000'
  const progressivoInvio = invoice.number.replace(/[^A-Za-z0-9]/g, '').slice(0, 10)
  const taxRate = parseFloat(String(invoice.taxRate))

  // Build DettaglioLinee
  const dettaglioLinee = lineItems
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, idx) => {
      const qty = parseFloat(String(item.quantity))
      const price = parseFloat(String(item.unitPrice))
      const total = parseFloat(String(item.total))
      return `        <DettaglioLinee>
          <NumeroLinea>${idx + 1}</NumeroLinea>
          <Descrizione>${escapeXml(item.description)}</Descrizione>
          <Quantita>${qty.toFixed(2)}</Quantita>
          <PrezzoUnitario>${price.toFixed(2)}</PrezzoUnitario>
          <PrezzoTotale>${total.toFixed(2)}</PrezzoTotale>
          <AliquotaIVA>${taxRate.toFixed(2)}</AliquotaIVA>
        </DettaglioLinee>`
    })
    .join('\n')

  // Discount
  const discountNum = parseFloat(String(invoice.discount)) || 0
  const subtotal = parseFloat(String(invoice.subtotal))
  const taxableAmount = subtotal - discountNum
  const taxAmount = parseFloat(String(invoice.taxAmount))

  // Sconto globale
  const scontoMaggiorazione = discountNum > 0
    ? `
          <ScontoMaggiorazione>
            <Tipo>SC</Tipo>
            <Importo>${formatAmount(discountNum)}</Importo>
          </ScontoMaggiorazione>`
    : ''

  // DatiPagamento - default a bonifico (MP05)
  const datiPagamento = `      <DatiPagamento>
        <CondizioniPagamento>TP02</CondizioniPagamento>
        <DettaglioPagamento>
          <ModalitaPagamento>MP05</ModalitaPagamento>
          <ImportoPagamento>${formatAmount(invoice.total)}</ImportoPagamento>${
    invoice.dueDate ? `\n          <DataScadenzaPagamento>${formatDate(invoice.dueDate)}</DataScadenzaPagamento>` : ''
  }${
    company.iban ? `\n          <IBAN>${escapeXml(company.iban)}</IBAN>` : ''
  }
        </DettaglioPagamento>
      </DatiPagamento>`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2.2/Schema_del_file_xml_FatturaPA_v1.2.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${escapeXml(company.partitaIva)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${escapeXml(progressivoInvio)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escapeXml(codiceDestinatario)}</CodiceDestinatario>${
    client.pec && codiceDestinatario === '0000000'
      ? `\n      <PECDestinatario>${escapeXml(client.pec)}</PECDestinatario>`
      : ''
  }
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapeXml(company.partitaIva)}</IdCodice>
        </IdFiscaleIVA>${
    company.codiceFiscale
      ? `\n        <CodiceFiscale>${escapeXml(company.codiceFiscale)}</CodiceFiscale>`
      : ''
  }
        <Anagrafica>
          <Denominazione>${escapeXml(company.ragioneSociale)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${escapeXml(company.regimeFiscale)}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(company.indirizzo)}</Indirizzo>
        <CAP>${escapeXml(company.cap)}</CAP>
        <Comune>${escapeXml(company.citta)}</Comune>
        <Provincia>${escapeXml(company.provincia)}</Provincia>
        <Nazione>${escapeXml(company.nazione)}</Nazione>
      </Sede>${
    company.telefono || company.email
      ? `\n      <Contatti>${company.telefono ? `\n        <Telefono>${escapeXml(company.telefono)}</Telefono>` : ''}${company.email ? `\n        <Email>${escapeXml(company.email)}</Email>` : ''}\n      </Contatti>`
      : ''
  }
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>${
    client.vatNumber
      ? `\n        <IdFiscaleIVA>\n          <IdPaese>IT</IdPaese>\n          <IdCodice>${escapeXml(client.vatNumber)}</IdCodice>\n        </IdFiscaleIVA>`
      : ''
  }${
    client.fiscalCode
      ? `\n        <CodiceFiscale>${escapeXml(client.fiscalCode)}</CodiceFiscale>`
      : ''
  }
        <Anagrafica>
          <Denominazione>${escapeXml(client.companyName)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>-</Indirizzo>
        <CAP>00000</CAP>
        <Comune>-</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${formatDate(invoice.issuedDate)}</Data>
        <Numero>${escapeXml(invoice.number)}</Numero>${scontoMaggiorazione}
        <ImportoTotaleDocumento>${formatAmount(invoice.total)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${dettaglioLinee}
      <DatiRiepilogo>
        <AliquotaIVA>${taxRate.toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${formatAmount(taxableAmount)}</ImponibileImporto>
        <Imposta>${formatAmount(taxAmount)}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
${datiPagamento}
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  return xml
}
