import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

const TERMS_AND_CONDITIONS = `TERMINI E CONDIZIONI GENERALI

1. OGGETTO
Il presente preventivo descrive i servizi che ${brand.companyUpper} si impegna a fornire al Cliente alle condizioni qui specificate.

2. MODALITÀ DI PAGAMENTO
- 30% alla firma del contratto (anticipo)
- 40% al raggiungimento delle milestone intermedie
- 30% alla consegna e approvazione finale
Pagamento entro 30 giorni dalla fattura via bonifico bancario.

3. TEMPI DI CONSEGNA
I tempi indicati sono stimati e decorrono dalla data di ricezione dell'anticipo e di tutti i materiali necessari dal Cliente. Ritardi nella fornitura di materiali da parte del Cliente sospendono i termini di consegna.

4. REVISIONI E MODIFICHE
Sono incluse fino a 2 revisioni per ogni fase del progetto. Revisioni aggiuntive saranno quotate separatamente. Modifiche sostanziali al brief originale saranno oggetto di nuovo preventivo.

5. PROPRIETÀ INTELLETTUALE
Al saldo completo, tutti i diritti di proprietà intellettuale sui deliverable vengono trasferiti al Cliente. ${brand.companyUpper} si riserva il diritto di utilizzare il progetto nel proprio portfolio.

6. GARANZIA E MANUTENZIONE
${brand.companyUpper} garantisce la correzione di bug e malfunzionamenti per 90 giorni dalla consegna, senza costi aggiuntivi. La manutenzione ordinaria (aggiornamenti, backup, monitoraggio) è soggetta a contratto separato.

7. RISERVATEZZA
Entrambe le parti si impegnano a mantenere riservate le informazioni confidenziali scambiate durante il progetto.

8. RECESSO
Il Cliente può recedere dal contratto con preavviso scritto di 15 giorni. In caso di recesso, saranno fatturate le attività già svolte.

9. LIMITAZIONE DI RESPONSABILITÀ
La responsabilità di ${brand.companyUpper} è limitata all'importo del preventivo. ${brand.companyUpper} non è responsabile per danni indiretti o consequenziali.

10. FORO COMPETENTE
Per qualsiasi controversia è competente il Foro di Vibo Valentia.

11. VALIDITÀ
Il presente preventivo ha validità di 30 giorni dalla data di emissione.`

const DEFAULT_NOTES = 'Tutti i prezzi sono espressi in EUR, IVA esclusa. Il preventivo include consulenza iniziale gratuita e supporto post-lancio per 30 giorni.'

interface SeedTemplate {
  name: string
  description: string
  lineItems: { description: string; quantity: number; unitPrice: number }[]
}

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: 'Sito Landing Page',
    description: 'Sito web landing page professionale con design responsive, ottimizzazione SEO base e setup hosting.',
    lineItems: [
      { description: 'Analisi UX/UI e progettazione wireframe', quantity: 1, unitPrice: 400 },
      { description: 'Sviluppo frontend responsive', quantity: 1, unitPrice: 750 },
      { description: 'Setup hosting e configurazione server', quantity: 1, unitPrice: 150 },
      { description: 'Ottimizzazione SEO base', quantity: 1, unitPrice: 300 },
      { description: 'Testing cross-browser e QA', quantity: 1, unitPrice: 250 },
      { description: 'Manutenzione e aggiornamenti 12 mesi', quantity: 1, unitPrice: 400 },
    ],
  },
  {
    name: 'E-commerce',
    description: 'Piattaforma e-commerce completa con catalogo prodotti, pagamenti online, gestione spedizioni e SEO dedicato.',
    lineItems: [
      { description: 'Analisi requisiti e architettura', quantity: 1, unitPrice: 650 },
      { description: 'Design UI/UX e-commerce', quantity: 1, unitPrice: 1200 },
      { description: 'Sviluppo piattaforma e catalogo prodotti', quantity: 1, unitPrice: 2200 },
      { description: 'Integrazione sistemi di pagamento', quantity: 1, unitPrice: 400 },
      { description: 'Configurazione spedizioni e logistica', quantity: 1, unitPrice: 300 },
      { description: 'Ottimizzazione SEO e-commerce', quantity: 1, unitPrice: 400 },
      { description: 'Formazione gestione piattaforma', quantity: 1, unitPrice: 250 },
      { description: 'Manutenzione e supporto tecnico 12 mesi', quantity: 1, unitPrice: 700 },
    ],
  },
  {
    name: 'Piattaforma SaaS / Gestionale',
    description: 'Sviluppo piattaforma SaaS o gestionale personalizzato con dashboard, backend scalabile e integrazioni.',
    lineItems: [
      { description: 'Raccolta requisiti e analisi funzionale', quantity: 1, unitPrice: 1200 },
      { description: 'Design dashboard e interfacce utente', quantity: 1, unitPrice: 1500 },
      { description: 'Sviluppo backend e API', quantity: 1, unitPrice: 3500 },
      { description: 'Sviluppo frontend e componenti interattivi', quantity: 1, unitPrice: 2200 },
      { description: 'Integrazioni esterne (API, webhook, servizi)', quantity: 1, unitPrice: 1000 },
      { description: 'Testing, QA e correzione bug', quantity: 1, unitPrice: 750 },
      { description: 'Deployment e configurazione produzione', quantity: 1, unitPrice: 400 },
      { description: 'Formazione utenti e documentazione', quantity: 1, unitPrice: 400 },
    ],
  },
  {
    name: 'Automazione Marketing',
    description: 'Setup completo automazione marketing: CRM, email automation, chatbot AI e analytics dashboard.',
    lineItems: [
      { description: 'Audit processi e flussi attuali', quantity: 1, unitPrice: 400 },
      { description: 'Setup e configurazione CRM', quantity: 1, unitPrice: 750 },
      { description: 'Automazione email marketing e sequenze', quantity: 1, unitPrice: 600 },
      { description: 'Sviluppo chatbot AI conversazionale', quantity: 1, unitPrice: 1000 },
      { description: 'Dashboard analytics e reportistica', quantity: 1, unitPrice: 450 },
      { description: 'Formazione team e best practices', quantity: 1, unitPrice: 300 },
    ],
  },
  {
    name: 'Digital Marketing & SEO',
    description: 'Strategia completa di digital marketing e SEO: audit, keyword research, ottimizzazione on-page, link building e content creation.',
    lineItems: [
      { description: 'Audit SEO completo del sito', quantity: 1, unitPrice: 400 },
      { description: 'Ricerca keyword e strategia contenuti', quantity: 1, unitPrice: 400 },
      { description: 'Ottimizzazione on-page e tecnica', quantity: 1, unitPrice: 300 },
      { description: 'Link building e digital PR', quantity: 1, unitPrice: 450 },
      { description: 'Creazione contenuti ottimizzati', quantity: 1, unitPrice: 600 },
      { description: 'Report analytics mensile', quantity: 1, unitPrice: 250 },
    ],
  },
  {
    name: 'Branding & Identita Visiva',
    description: 'Progetto completo di branding e identita visiva: logo, brand book, materiali marketing e kit social media.',
    lineItems: [
      { description: 'Ricerca competitor e analisi mercato', quantity: 1, unitPrice: 400 },
      { description: 'Design logo e varianti', quantity: 1, unitPrice: 750 },
      { description: 'Creazione brand book e linee guida', quantity: 1, unitPrice: 600 },
      { description: 'Materiali marketing (biglietti, brochure)', quantity: 1, unitPrice: 450 },
      { description: 'Kit social media (cover, template post)', quantity: 1, unitPrice: 300 },
      { description: 'Adattamento multi-formato e consegna file', quantity: 1, unitPrice: 300 },
    ],
  },
  {
    name: 'Soluzioni AI & Automazioni',
    description: 'Soluzioni di intelligenza artificiale e automazione: chatbot, integrazioni API AI, workflow automatizzati e monitoring.',
    lineItems: [
      { description: 'Analisi opportunita AI e fattibilita', quantity: 1, unitPrice: 650 },
      { description: 'Sviluppo chatbot AI personalizzato', quantity: 1, unitPrice: 2000 },
      { description: 'Integrazione API AI (OpenAI, Claude, custom)', quantity: 1, unitPrice: 1000 },
      { description: 'Automazione workflow e processi', quantity: 1, unitPrice: 1000 },
      { description: 'Dashboard monitoring e KPI', quantity: 1, unitPrice: 450 },
      { description: 'Formazione team e documentazione', quantity: 1, unitPrice: 400 },
    ],
  },
]

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!

    // Check which templates already exist by name
    const existingTemplates = await prisma.quoteTemplate.findMany({
      where: {
        name: { in: SEED_TEMPLATES.map((t) => t.name) },
      },
      select: { name: true },
    })
    const existingNames = new Set(existingTemplates.map((t) => t.name))

    const templatesToCreate = SEED_TEMPLATES.filter((t) => !existingNames.has(t.name))

    if (templatesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tutti i template predefiniti esistono gia.',
        created: 0,
        skipped: SEED_TEMPLATES.length,
      })
    }

    let createdCount = 0

    for (const template of templatesToCreate) {
      let slug = slugify(template.name)
      const existingSlug = await prisma.quoteTemplate.findUnique({ where: { slug } })
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`
      }

      await prisma.quoteTemplate.create({
        data: {
          name: template.name,
          slug,
          description: template.description,
          isGlobal: true,
          isActive: true,
          creatorId: userId,
          primaryColor: '#1a1a2e',
          secondaryColor: '#16213e',
          logoUrl: '/logo-official.png',
          numberPrefix: 'PRV',
          numberFormat: '{PREFIX}-{YYYY}-{NNN}',
          defaultTaxRate: 22,
          defaultDiscount: 0,
          defaultValidDays: 30,
          defaultNotes: DEFAULT_NOTES,
          termsAndConditions: TERMS_AND_CONDITIONS,
          lineItems: {
            create: template.lineItems.map((item, i) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              sortOrder: i,
            })),
          },
        },
      })

      createdCount++
    }

    return NextResponse.json({
      success: true,
      message: `Creati ${createdCount} template predefiniti.`,
      created: createdCount,
      skipped: SEED_TEMPLATES.length - createdCount,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[quote-templates/seed]', e)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
