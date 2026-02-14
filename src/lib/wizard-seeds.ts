import { prisma } from './prisma'
import type { Prisma } from '@/generated/prisma/client'

interface SeedField {
  label: string
  name: string
  type: string
  isRequired?: boolean
  sortOrder: number
  crmMapping?: string
  placeholder?: string
  helpText?: string
  options?: { label: string; value: string }[]
  validation?: { min?: number; max?: number; minLength?: number; maxLength?: number }
}

interface SeedStep {
  title: string
  description: string
  sortOrder: number
  fields: SeedField[]
}

interface SeedTemplate {
  name: string
  slug: string
  description: string
  category: string
  isSystem: boolean
  status: string
  completionMessage: string
  steps: SeedStep[]
}

export async function seedDefaultWizards(creatorId: string) {
  const templates: SeedTemplate[] = [
    {
      name: 'Raccolta Info Nuovo Cliente',
      slug: 'raccolta-info-cliente',
      description: 'Modulo per raccogliere le informazioni principali di un nuovo cliente aziendale',
      category: 'onboarding',
      isSystem: true,
      status: 'PUBLISHED',
      completionMessage: 'Grazie! Le informazioni sono state registrate correttamente nel sistema.',
      steps: [
        {
          title: 'Dati Azienda',
          description: 'Informazioni principali dell\'azienda',
          sortOrder: 0,
          fields: [
            { label: 'Ragione Sociale', name: 'ragione_sociale', type: 'TEXT', isRequired: true, sortOrder: 0, crmMapping: 'client.companyName' },
            { label: 'Partita IVA', name: 'partita_iva', type: 'TEXT', placeholder: 'IT...', sortOrder: 1, crmMapping: 'client.vatNumber' },
            { label: 'Codice Fiscale', name: 'codice_fiscale', type: 'TEXT', sortOrder: 2, crmMapping: 'client.fiscalCode' },
            { label: 'PEC', name: 'pec', type: 'EMAIL', placeholder: 'pec@azienda.it', sortOrder: 3, crmMapping: 'client.pec' },
            { label: 'Codice SDI', name: 'sdi', type: 'TEXT', placeholder: '7 caratteri', sortOrder: 4, crmMapping: 'client.sdi' },
            { label: 'Settore', name: 'settore', type: 'SELECT', sortOrder: 5, crmMapping: 'client.industry', options: [
              { label: 'Tecnologia', value: 'tecnologia' },
              { label: 'Manifattura', value: 'manifattura' },
              { label: 'Servizi', value: 'servizi' },
              { label: 'Commercio', value: 'commercio' },
              { label: 'Ristorazione', value: 'ristorazione' },
              { label: 'Sanita', value: 'sanita' },
              { label: 'Edilizia', value: 'edilizia' },
              { label: 'Altro', value: 'altro' },
            ]},
          ],
        },
        {
          title: 'Contatto Principale',
          description: 'Dati del referente aziendale',
          sortOrder: 1,
          fields: [
            { label: 'Nome', name: 'nome_contatto', type: 'TEXT', isRequired: true, sortOrder: 0, crmMapping: 'contact.firstName' },
            { label: 'Cognome', name: 'cognome_contatto', type: 'TEXT', isRequired: true, sortOrder: 1, crmMapping: 'contact.lastName' },
            { label: 'Email', name: 'email_contatto', type: 'EMAIL', isRequired: true, sortOrder: 2, crmMapping: 'contact.email' },
            { label: 'Telefono', name: 'telefono_contatto', type: 'PHONE', sortOrder: 3, crmMapping: 'contact.phone' },
            { label: 'Ruolo in azienda', name: 'ruolo_contatto', type: 'TEXT', placeholder: 'es. Amministratore, IT Manager...', sortOrder: 4, crmMapping: 'contact.role' },
          ],
        },
        {
          title: 'Note',
          description: 'Informazioni aggiuntive',
          sortOrder: 2,
          fields: [
            { label: 'Note aggiuntive', name: 'note', type: 'TEXTAREA', placeholder: 'Altre informazioni utili...', sortOrder: 0, crmMapping: 'client.notes' },
            { label: 'Come ci hai conosciuto?', name: 'fonte', type: 'SELECT', sortOrder: 1, crmMapping: 'client.source', options: [
              { label: 'Passaparola', value: 'passaparola' },
              { label: 'Google', value: 'google' },
              { label: 'Social media', value: 'social' },
              { label: 'Fiera/Evento', value: 'evento' },
              { label: 'Altro', value: 'altro' },
            ]},
          ],
        },
      ],
    },
    {
      name: 'Analisi Bisogni',
      slug: 'analisi-bisogni',
      description: 'Questionario per analizzare le esigenze e il contesto del cliente',
      category: 'analisi',
      isSystem: true,
      status: 'PUBLISHED',
      completionMessage: 'Analisi completata. Il team commerciale elaborera una proposta personalizzata.',
      steps: [
        {
          title: 'Contesto',
          description: 'Informazioni generali sull\'azienda',
          sortOrder: 0,
          fields: [
            { label: 'Settore di attivita', name: 'settore', type: 'TEXT', isRequired: true, sortOrder: 0 },
            { label: 'Dimensione azienda', name: 'dimensione', type: 'SELECT', isRequired: true, sortOrder: 1, options: [
              { label: '1-5 dipendenti', value: '1-5' },
              { label: '6-20 dipendenti', value: '6-20' },
              { label: '21-50 dipendenti', value: '21-50' },
              { label: '51-200 dipendenti', value: '51-200' },
              { label: '200+ dipendenti', value: '200+' },
            ]},
            { label: 'Fatturato annuo', name: 'fatturato', type: 'SELECT', sortOrder: 2, options: [
              { label: 'Fino a 100.000 EUR', value: '<100k' },
              { label: '100.000 - 500.000 EUR', value: '100k-500k' },
              { label: '500.000 - 2M EUR', value: '500k-2m' },
              { label: '2M - 10M EUR', value: '2m-10m' },
              { label: 'Oltre 10M EUR', value: '>10m' },
            ]},
          ],
        },
        {
          title: 'Esigenze',
          description: 'Cosa stai cercando?',
          sortOrder: 1,
          fields: [
            { label: 'Qual e il problema principale che vuoi risolvere?', name: 'problema', type: 'TEXTAREA', isRequired: true, sortOrder: 0 },
            { label: 'Soluzioni attuali utilizzate', name: 'soluzioni_attuali', type: 'TEXTAREA', placeholder: 'Software, processi, strumenti attualmente in uso...', sortOrder: 1 },
            { label: 'Cosa ti aspetti dalla soluzione?', name: 'aspettative', type: 'TEXTAREA', isRequired: true, sortOrder: 2 },
          ],
        },
        {
          title: 'Budget e Tempi',
          description: 'Indicazioni su budget e tempistiche',
          sortOrder: 2,
          fields: [
            { label: 'Budget indicativo', name: 'budget', type: 'SELECT', sortOrder: 0, options: [
              { label: 'Fino a 5.000 EUR', value: '<5k' },
              { label: '5.000 - 15.000 EUR', value: '5k-15k' },
              { label: '15.000 - 50.000 EUR', value: '15k-50k' },
              { label: 'Oltre 50.000 EUR', value: '>50k' },
              { label: 'Da definire', value: 'tbd' },
            ]},
            { label: 'Urgenza', name: 'urgenza', type: 'SCALE', sortOrder: 1, validation: { min: 1, max: 5 }, helpText: '1 = bassa, 5 = critica' },
            { label: 'Timeline desiderata', name: 'timeline', type: 'SELECT', sortOrder: 2, options: [
              { label: 'Entro 1 mese', value: '1m' },
              { label: 'Entro 3 mesi', value: '3m' },
              { label: 'Entro 6 mesi', value: '6m' },
              { label: 'Nessuna fretta', value: 'nessuna' },
            ]},
          ],
        },
        {
          title: 'Competizione',
          description: 'Informazioni sul contesto competitivo',
          sortOrder: 3,
          fields: [
            { label: 'Competitor conosciuti', name: 'competitor', type: 'TEXTAREA', placeholder: 'Nomi di competitor o soluzioni alternative che hai valutato...', sortOrder: 0 },
            { label: 'Cosa ti differenzia dalla concorrenza?', name: 'differenziazione', type: 'TEXTAREA', sortOrder: 1 },
          ],
        },
      ],
    },
    {
      name: 'Questionario Pre-Preventivo',
      slug: 'questionario-pre-preventivo',
      description: 'Raccolta specifiche per elaborare un preventivo accurato',
      category: 'preventivo',
      isSystem: true,
      status: 'PUBLISHED',
      completionMessage: 'Grazie! Elaboreremo il preventivo e ti contatteremo entro 48 ore.',
      steps: [
        {
          title: 'Tipo Progetto',
          description: 'Che tipo di progetto hai in mente?',
          sortOrder: 0,
          fields: [
            { label: 'Categoria progetto', name: 'categoria', type: 'SELECT', isRequired: true, sortOrder: 0, options: [
              { label: 'Sito web / Landing page', value: 'website' },
              { label: 'E-commerce', value: 'ecommerce' },
              { label: 'Applicazione web (SaaS)', value: 'webapp' },
              { label: 'App mobile', value: 'mobile' },
              { label: 'Automazione / Integrazione', value: 'automazione' },
              { label: 'Consulenza', value: 'consulenza' },
              { label: 'Altro', value: 'altro' },
            ]},
            { label: 'Descrizione del progetto', name: 'descrizione', type: 'TEXTAREA', isRequired: true, sortOrder: 1, placeholder: 'Descrivi brevemente il progetto che hai in mente...' },
          ],
        },
        {
          title: 'Specifiche',
          description: 'Dettagli tecnici e funzionali',
          sortOrder: 1,
          fields: [
            { label: 'Funzionalita richieste', name: 'funzionalita', type: 'MULTISELECT', sortOrder: 0, options: [
              { label: 'Autenticazione utenti', value: 'auth' },
              { label: 'Pagamenti online', value: 'payments' },
              { label: 'Dashboard / Analytics', value: 'dashboard' },
              { label: 'Gestione contenuti (CMS)', value: 'cms' },
              { label: 'Notifiche (email/push)', value: 'notifications' },
              { label: 'Chat / Messaggistica', value: 'chat' },
              { label: 'Integrazione API esterne', value: 'api' },
              { label: 'Multi-lingua', value: 'i18n' },
            ]},
            { label: 'Integrazioni necessarie', name: 'integrazioni', type: 'TEXTAREA', sortOrder: 1, placeholder: 'Sistemi esistenti con cui integrare (ERP, CRM, ecc.)...' },
            { label: 'Numero utenti stimato', name: 'utenti', type: 'SELECT', sortOrder: 2, options: [
              { label: 'Fino a 100', value: '<100' },
              { label: '100 - 1.000', value: '100-1k' },
              { label: '1.000 - 10.000', value: '1k-10k' },
              { label: 'Oltre 10.000', value: '>10k' },
            ]},
          ],
        },
        {
          title: 'Design',
          description: 'Preferenze grafiche e di design',
          sortOrder: 2,
          fields: [
            { label: 'Riferimenti visivi', name: 'riferimenti', type: 'TEXTAREA', sortOrder: 0, placeholder: 'Link a siti/app che ti piacciono come riferimento...' },
            { label: 'Hai brand guidelines?', name: 'brand_guidelines', type: 'RADIO', sortOrder: 1, options: [
              { label: 'Si, complete (logo, colori, font)', value: 'complete' },
              { label: 'Parziali (solo logo)', value: 'parziali' },
              { label: 'No, da creare', value: 'no' },
            ]},
            { label: 'Preferenze di stile', name: 'stile', type: 'MULTISELECT', sortOrder: 2, options: [
              { label: 'Minimale', value: 'minimale' },
              { label: 'Moderno', value: 'moderno' },
              { label: 'Corporate', value: 'corporate' },
              { label: 'Creativo', value: 'creativo' },
              { label: 'Elegante', value: 'elegante' },
            ]},
          ],
        },
        {
          title: 'Aspettative',
          description: 'Tempistiche e priorita',
          sortOrder: 3,
          fields: [
            { label: 'Deadline desiderata', name: 'deadline', type: 'DATE', sortOrder: 0, helpText: 'Data entro cui vorresti il progetto completato' },
            { label: 'Priorita', name: 'priorita', type: 'RATING', sortOrder: 1, validation: { max: 5 }, helpText: 'Quanto e importante questo progetto per te? (1-5 stelle)' },
            { label: 'Considerazioni speciali', name: 'considerazioni', type: 'TEXTAREA', sortOrder: 2, placeholder: 'Requisiti particolari, vincoli, note aggiuntive...' },
          ],
        },
      ],
    },
  ]

  for (const tpl of templates) {
    const existing = await prisma.wizardTemplate.findUnique({ where: { slug: tpl.slug } })
    if (existing) continue

    await prisma.wizardTemplate.create({
      data: {
        name: tpl.name,
        slug: tpl.slug,
        description: tpl.description,
        category: tpl.category,
        isSystem: tpl.isSystem,
        status: tpl.status,
        creatorId: creatorId,
        completionMessage: tpl.completionMessage,
        steps: {
          create: tpl.steps.map((step) => ({
            title: step.title,
            description: step.description,
            sortOrder: step.sortOrder,
            fields: {
              create: step.fields.map((field): Prisma.WizardFieldCreateWithoutStepInput => ({
                label: field.label,
                name: field.name,
                type: field.type,
                placeholder: field.placeholder,
                helpText: field.helpText,
                isRequired: field.isRequired ?? false,
                sortOrder: field.sortOrder,
                options: field.options as Prisma.InputJsonValue | undefined,
                validation: field.validation as Prisma.InputJsonValue | undefined,
                crmMapping: field.crmMapping,
              })),
            },
          })),
        },
      },
    })
  }
}
