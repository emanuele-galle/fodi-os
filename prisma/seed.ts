import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_PASSWORD = 'FodiOS2026!'

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

async function main() {
  console.log('Seeding FODI-OS database...\n')

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  // ============================================================
  // WORKSPACES
  // ============================================================
  const [commerciale, delivery, creative] = await Promise.all([
    prisma.workspace.upsert({
      where: { slug: 'commerciale' },
      update: {},
      create: {
        name: 'Commerciale',
        slug: 'commerciale',
        description: 'Space commerciale per vendite e gestione clienti',
        color: '#3B82F6',
        icon: 'briefcase',
        sortOrder: 1,
      },
    }),
    prisma.workspace.upsert({
      where: { slug: 'delivery' },
      update: {},
      create: {
        name: 'Delivery',
        slug: 'delivery',
        description: 'Space per il team tecnico e project management',
        color: '#10B981',
        icon: 'code',
        sortOrder: 2,
      },
    }),
    prisma.workspace.upsert({
      where: { slug: 'creative' },
      update: {},
      create: {
        name: 'Creative',
        slug: 'creative',
        description: 'Space per contenuti, video e social media',
        color: '#8B5CF6',
        icon: 'palette',
        sortOrder: 3,
      },
    }),
  ])

  console.log('Workspaces created')

  // ============================================================
  // USERS
  // ============================================================
  const usersData = [
    { email: 'emanuele@fodisrl.it', firstName: 'Emanuele', lastName: 'Galle', role: 'ADMIN' as const },
    { email: 'riccardo@fodisrl.it', firstName: 'Riccardo', lastName: 'Tirinato', role: 'SALES' as const },
    { email: 'stefano@fodisrl.it', firstName: 'Stefano', lastName: 'Coletta', role: 'PM' as const },
    { email: 'raffaele@fodisrl.it', firstName: 'Raffaele', lastName: 'Dev', role: 'DEVELOPER' as const },
    { email: 'matar@fodisrl.it', firstName: 'Matar', lastName: 'Dev', role: 'DEVELOPER' as const },
    { email: 'angelo@fodisrl.it', firstName: 'Angelo', lastName: 'Dev', role: 'DEVELOPER' as const },
    { email: 'raffo@fodisrl.it', firstName: 'Raffo', lastName: 'Aversa', role: 'CONTENT' as const },
    { email: 'chiara@fodisrl.it', firstName: 'Chiara', lastName: 'Support', role: 'SUPPORT' as const },
  ]

  const users: Awaited<ReturnType<typeof prisma.user.upsert>>[] = []
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: { ...userData, password: hashedPassword },
    })
    users.push(user)
    console.log(`  User: ${user.firstName} ${user.lastName} (${user.role})`)
  }

  const [emanuele, riccardo, stefano, raffaele, matar, angelo, raffo, chiara] = users

  // Workspace Assignments
  const workspaceAssignments = [
    { workspaceId: commerciale.id, userId: emanuele.id, role: 'OWNER' as const },
    { workspaceId: commerciale.id, userId: riccardo.id, role: 'MEMBER' as const },
    { workspaceId: commerciale.id, userId: chiara.id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: emanuele.id, role: 'OWNER' as const },
    { workspaceId: delivery.id, userId: stefano.id, role: 'ADMIN' as const },
    { workspaceId: delivery.id, userId: raffaele.id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: matar.id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: angelo.id, role: 'MEMBER' as const },
    { workspaceId: creative.id, userId: emanuele.id, role: 'OWNER' as const },
    { workspaceId: creative.id, userId: raffo.id, role: 'MEMBER' as const },
  ]

  for (const a of workspaceAssignments) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: a.workspaceId, userId: a.userId } },
      update: {},
      create: a,
    })
  }
  console.log('Workspace assignments created\n')

  // ============================================================
  // CLIENTS (13 reali)
  // ============================================================
  const clientsData = [
    // VPS 1 clients
    { companyName: 'Confial / FAILMS', slug: 'confial-failms', vatNumber: 'IT04532891007', pec: 'confial@pec.it', sdi: 'USAL8PV', website: 'https://failms.org', industry: 'Sindacato/Formazione', source: 'Diretto', status: 'ACTIVE' as const, notes: 'Piattaforma formazione sindacale LMS. Contratto pluriennale.', tags: ['formazione', 'sindacato', 'lms', 'vps1'] },
    { companyName: 'Dolciaria Farina', slug: 'dolciaria-farina', vatNumber: 'IT03891267045', website: 'https://farina.fodivps1.cloud', industry: 'Food & Beverage', source: 'Referral', status: 'ACTIVE' as const, notes: 'E-commerce dolci artigianali. Spedizioni nazionali.', tags: ['ecommerce', 'food', 'artigianale', 'vps1'] },
    { companyName: 'Eccellenze Italiane TV', slug: 'eccellenze-tv', vatNumber: 'IT07654321098', pec: 'eccellenzetv@pec.it', sdi: 'M5UXCR1', website: 'https://eccellenze-tv.fodivps1.cloud', industry: 'Media/Intrattenimento', source: 'Networking', status: 'ACTIVE' as const, notes: 'Piattaforma streaming video. Contenuti Made in Italy.', tags: ['streaming', 'media', 'video', 'vps1'] },
    { companyName: 'Gruppo Cestari', slug: 'gruppo-cestari', vatNumber: 'IT05678901234', pec: 'gruppocestari@pec.it', sdi: 'W7YVJK9', website: 'https://gruppocestari.com', industry: 'Multiservizi', source: 'Diretto', status: 'ACTIVE' as const, notes: 'Sito corporate gruppo aziendale multiservizi.', tags: ['corporate', 'multiservizi', 'vps1'] },
    { companyName: 'Italafrica Centrale', slug: 'italafrica-centrale', vatNumber: 'IT08901234567', website: 'https://italafricacentrale.com', industry: 'Relazioni Internazionali', source: 'Referral', status: 'ACTIVE' as const, notes: 'Sito corporate relazioni Italia-Africa. Multilingua.', tags: ['internazionale', 'corporate', 'multilingua', 'vps1'] },
    { companyName: 'UNSIC', slug: 'unsic', vatNumber: 'IT06543210987', pec: 'unsic@pec.it', sdi: 'KRRH6B9', website: 'https://unsic.fodivps1.cloud', industry: 'Sindacato', source: 'Diretto', status: 'ACTIVE' as const, notes: 'Portale sindacale nazionale. Area riservata iscritti.', tags: ['sindacato', 'portale', 'iscritti', 'vps1'] },
    // VPS 2 clients
    { companyName: 'Barber99', slug: 'barber99', vatNumber: 'IT12309876543', website: 'https://barber99.it', industry: 'Beauty/Grooming', source: 'Google', status: 'ACTIVE' as const, notes: 'Sito web barbershop con booking online.', tags: ['beauty', 'barbershop', 'booking', 'vps2'] },
    { companyName: 'Ecolive SRL', slug: 'ecolive', vatNumber: 'IT09876543210', pec: 'ecolive@pec.it', sdi: 'J6URRTW', website: 'https://ecolive.srl', industry: 'Edilizia/Green Building', source: 'Fiera', status: 'ACTIVE' as const, notes: 'Case prefabbricate in legno. Visualizzatore 3D modelli.', tags: ['edilizia', 'green', '3d', 'prefabbricati', 'vps2'] },
    { companyName: 'General Brokers SRL', slug: 'general-brokers', vatNumber: 'IT01onal45678', pec: 'generalbrokers@pec.it', sdi: 'T9K4ZR6', website: 'https://general-brokers.fodivps2.cloud', industry: 'Assicurazioni', source: 'Networking', status: 'ACTIVE' as const, notes: 'Broker assicurativo dal 1977. Sito vetrina con area clienti.', tags: ['assicurazioni', 'broker', 'vetrina', 'vps2'] },
    { companyName: 'KineLab', slug: 'kinelab', vatNumber: 'IT04567890123', website: 'https://kinelab.fodivps2.cloud', industry: 'Salute/Fisioterapia', source: 'Passaparola', status: 'ACTIVE' as const, notes: 'Studio fisioterapia. Booking e schede paziente.', tags: ['salute', 'fisioterapia', 'booking', 'vps2'] },
    { companyName: 'OZ Extrait', slug: 'oz-extrait', vatNumber: 'IT11223344556', website: 'https://oz.fodivps2.cloud', industry: 'Luxury/Profumeria', source: 'Referral', status: 'ACTIVE' as const, notes: 'Profumeria di nicchia. E-commerce con catalogo esclusivo.', tags: ['luxury', 'profumeria', 'ecommerce', 'vps2'] },
    { companyName: 'Spektrum Tattoo', slug: 'spektrum-tattoo', vatNumber: 'IT06789012345', website: 'https://spektrum-tattoo.fodivps2.cloud', industry: 'Arte/Tattoo', source: 'Instagram', status: 'ACTIVE' as const, notes: 'Studio tatuaggi con booking online e portfolio artisti.', tags: ['tattoo', 'arte', 'booking', 'portfolio', 'vps2'] },
    { companyName: 'SaaS Generali', slug: 'saas-generali', vatNumber: 'IT99887766554', website: 'https://saas-generali.fodivps1.cloud', industry: 'Software/SaaS', source: 'Interno', status: 'PROSPECT' as const, notes: 'Piattaforma SaaS demo interna. Progetto esplorativo.', tags: ['saas', 'interno', 'demo', 'vps1'] },
  ]

  const clients: Awaited<ReturnType<typeof prisma.client.upsert>>[] = []
  for (const cd of clientsData) {
    const client = await prisma.client.upsert({
      where: { slug: cd.slug },
      update: {},
      create: cd,
    })
    clients.push(client)
    console.log(`  Client: ${cd.companyName} (${cd.status})`)
  }

  const [confial, dolciariaFarina, eccellenzeTV, gruppoCestari, italafrica, unsic, barber99, ecolive, generalBrokers, kinelab, ozExtrait, spektrumTattoo, saasGenerali] = clients

  // ============================================================
  // CONTACTS (1-2 per cliente)
  // ============================================================
  await prisma.contact.createMany({
    data: [
      // Confial / FAILMS
      { clientId: confial.id, firstName: 'Roberto', lastName: 'Mancuso', email: 'r.mancuso@confial.it', phone: '+39 06 5551234', role: 'Segretario Generale', isPrimary: true },
      { clientId: confial.id, firstName: 'Valentina', lastName: 'Parisi', email: 'v.parisi@confial.it', phone: '+39 06 5551235', role: 'Responsabile Formazione', isPrimary: false },
      // Dolciaria Farina
      { clientId: dolciariaFarina.id, firstName: 'Salvatore', lastName: 'Farina', email: 'salvatore@dolciariafarina.it', phone: '+39 081 7723456', role: 'Titolare', isPrimary: true },
      { clientId: dolciariaFarina.id, firstName: 'Teresa', lastName: 'Farina', email: 'teresa@dolciariafarina.it', phone: '+39 081 7723457', role: 'Responsabile E-commerce', isPrimary: false },
      // Eccellenze Italiane TV
      { clientId: eccellenzeTV.id, firstName: 'Andrea', lastName: 'Marchetti', email: 'a.marchetti@eccellenzetv.it', phone: '+39 02 8891234', role: 'Direttore Editoriale', isPrimary: true },
      { clientId: eccellenzeTV.id, firstName: 'Giulia', lastName: 'Lombardi', email: 'g.lombardi@eccellenzetv.it', phone: '+39 02 8891235', role: 'Produttrice', isPrimary: false },
      // Gruppo Cestari
      { clientId: gruppoCestari.id, firstName: 'Lorenzo', lastName: 'Cestari', email: 'l.cestari@gruppocestari.com', phone: '+39 06 3341234', role: 'Amministratore Delegato', isPrimary: true },
      { clientId: gruppoCestari.id, firstName: 'Monica', lastName: 'Santoro', email: 'm.santoro@gruppocestari.com', phone: '+39 06 3341235', role: 'Responsabile Marketing', isPrimary: false },
      // Italafrica Centrale
      { clientId: italafrica.id, firstName: 'Giovanni', lastName: 'Ferrante', email: 'g.ferrante@italafricacentrale.com', phone: '+39 06 4451234', role: 'Presidente', isPrimary: true },
      // UNSIC
      { clientId: unsic.id, firstName: 'Domenico', lastName: 'Pangallo', email: 'd.pangallo@unsic.it', phone: '+39 06 7761234', role: 'Segretario Nazionale', isPrimary: true },
      { clientId: unsic.id, firstName: 'Paola', lastName: 'Vitiello', email: 'p.vitiello@unsic.it', phone: '+39 06 7761235', role: 'Responsabile Comunicazione', isPrimary: false },
      // Barber99
      { clientId: barber99.id, firstName: 'Luca', lastName: 'Ferretti', email: 'luca@barber99.it', phone: '+39 347 9912345', role: 'Titolare', isPrimary: true },
      // Ecolive SRL
      { clientId: ecolive.id, firstName: 'Dominik', lastName: 'Berger', email: 'dominik@ecolive.srl', phone: '+39 340 5567890', role: 'CEO', isPrimary: true },
      { clientId: ecolive.id, firstName: 'Martina', lastName: 'Zanetti', email: 'martina@ecolive.srl', phone: '+39 340 5567891', role: 'Responsabile Commerciale', isPrimary: false },
      // General Brokers SRL
      { clientId: generalBrokers.id, firstName: 'Franco', lastName: 'Pellegrini', email: 'f.pellegrini@generalbrokers.it', phone: '+39 02 6651234', role: 'Direttore Generale', isPrimary: true },
      // KineLab
      { clientId: kinelab.id, firstName: 'Simone', lastName: 'Ruggiero', email: 'simone@kinelab.it', phone: '+39 333 4456789', role: 'Fisioterapista / Titolare', isPrimary: true },
      // OZ Extrait
      { clientId: ozExtrait.id, firstName: 'Alessia', lastName: 'Morandi', email: 'alessia@ozextrait.com', phone: '+39 335 6678901', role: 'Fondatrice', isPrimary: true },
      { clientId: ozExtrait.id, firstName: 'Marco', lastName: 'Taviani', email: 'marco@ozextrait.com', phone: '+39 335 6678902', role: 'Responsabile E-commerce', isPrimary: false },
      // Spektrum Tattoo
      { clientId: spektrumTattoo.id, firstName: 'Daniele', lastName: 'Greco', email: 'daniele@spektrumtattoo.it', phone: '+39 320 7789012', role: 'Titolare / Artista', isPrimary: true },
      // SaaS Generali (interno)
      { clientId: saasGenerali.id, firstName: 'Emanuele', lastName: 'Galle', email: 'emanuele@fodisrl.it', phone: '+39 345 1234567', role: 'Project Owner', isPrimary: true },
    ],
    skipDuplicates: true,
  })
  console.log('  Contacts created (1-2 per client)')

  // ============================================================
  // INTERACTIONS (2-3 per clienti principali)
  // ============================================================
  await prisma.interaction.createMany({
    data: [
      // Confial / FAILMS (3)
      { clientId: confial.id, type: 'MEETING', subject: 'Kickoff piattaforma FAILMS', content: 'Riunione di avvio progetto LMS. Definiti requisiti: corsi, certificati, area docenti. Budget approvato.', date: daysAgo(90) },
      { clientId: confial.id, type: 'CALL', subject: 'Review modulo certificati', content: 'Revisione funzionalita modulo certificazioni. Richieste modifiche al template PDF.', date: daysAgo(30) },
      { clientId: confial.id, type: 'EMAIL', subject: 'Segnalazione problema upload', content: 'Roberto segnala errore nel caricamento materiali didattici sopra i 50MB.', date: daysAgo(5) },
      // Ecolive SRL (3)
      { clientId: ecolive.id, type: 'MEETING', subject: 'Presentazione progetto sito 3D', content: 'Presentazione concept sito con visualizzatore 3D case prefabbricate. Dominik entusiasta.', date: daysAgo(45) },
      { clientId: ecolive.id, type: 'CALL', subject: 'Feedback mockup homepage', content: 'Call con Dominik per revisione mockup. Richieste: piu enfasi su sostenibilita, sezione progetti realizzati.', date: daysAgo(20) },
      { clientId: ecolive.id, type: 'WHATSAPP', subject: 'Modelli 3D aggiornati', content: 'Martina ha inviato i nuovi modelli 3D delle case EcoLine e NaturHome.', date: daysAgo(10) },
      // Barber99 (2)
      { clientId: barber99.id, type: 'CALL', subject: 'Aggiornamento orari e servizi', content: 'Luca richiede aggiornamento orari apertura e aggiunta nuovi servizi al sito.', date: daysAgo(14) },
      { clientId: barber99.id, type: 'WHATSAPP', subject: 'Nuove foto negozio', content: 'Ricevute foto professionali del negozio per aggiornamento gallery.', date: daysAgo(7) },
      // Gruppo Cestari (2)
      { clientId: gruppoCestari.id, type: 'MEETING', subject: 'Planning restyling sito', content: 'Incontro con Lorenzo Cestari per discutere restyling sito corporate. Vogliono sezione careers.', date: daysAgo(20) },
      { clientId: gruppoCestari.id, type: 'EMAIL', subject: 'Contenuti nuove divisioni', content: 'Monica ha inviato i contenuti per le nuove divisioni aziendali.', date: daysAgo(8) },
      // OZ Extrait (2)
      { clientId: ozExtrait.id, type: 'MEETING', subject: 'Setup e-commerce profumeria', content: 'Riunione per definire catalogo prodotti, pricing e sistema di pagamento Stripe.', date: daysAgo(25) },
      { clientId: ozExtrait.id, type: 'CALL', subject: 'Problema pagamento Stripe', content: 'Alessia segnala errore durante checkout con alcune carte. Da investigare.', date: daysAgo(3) },
      // Spektrum Tattoo (2)
      { clientId: spektrumTattoo.id, type: 'CALL', subject: 'Setup booking online', content: 'Daniele vuole integrare un sistema di prenotazione appuntamenti collegato a Google Calendar.', date: daysAgo(15) },
      { clientId: spektrumTattoo.id, type: 'WHATSAPP', subject: 'Portfolio aggiornato', content: 'Inviate 30 nuove foto lavori per aggiornamento portfolio artisti.', date: daysAgo(4) },
      // UNSIC (1)
      { clientId: unsic.id, type: 'MEETING', subject: 'Review portale iscritti', content: 'Review mensile del portale. Richiesta integrazione con sistema tessere digitali.', date: daysAgo(12) },
      // Dolciaria Farina (1)
      { clientId: dolciariaFarina.id, type: 'CALL', subject: 'Nuova linea prodotti', content: 'Salvatore vuole aggiungere la nuova linea natalizia al catalogo e-commerce.', date: daysAgo(10) },
    ],
    skipDuplicates: true,
  })
  console.log('  Interactions created\n')

  // ============================================================
  // PROJECTS (uno per cliente attivo + interni)
  // ============================================================
  const projConfial = await prisma.project.upsert({
    where: { slug: 'failms-piattaforma-formazione' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: confial.id, name: 'FAILMS - Piattaforma Formazione', slug: 'failms-piattaforma-formazione',
      description: 'Piattaforma LMS per formazione sindacale. Corsi online, certificazioni, area docenti, tracking progressi.',
      status: 'IN_PROGRESS', priority: 'HIGH', startDate: daysAgo(90), endDate: daysFromNow(60),
      budgetAmount: 28000, budgetHours: 500, color: '#DC2626',
    },
  })

  const projFarina = await prisma.project.upsert({
    where: { slug: 'dolciaria-farina-ecommerce' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: dolciariaFarina.id, name: 'Dolciaria Farina - E-commerce', slug: 'dolciaria-farina-ecommerce',
      description: 'E-commerce dolci artigianali con catalogo prodotti, gestione ordini e spedizioni nazionali.',
      status: 'COMPLETED', priority: 'MEDIUM', startDate: daysAgo(180), endDate: daysAgo(30),
      budgetAmount: 12000, budgetHours: 200, color: '#F59E0B',
    },
  })

  const projEccellenzeTV = await prisma.project.upsert({
    where: { slug: 'eccellenze-tv-streaming' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: eccellenzeTV.id, name: 'Eccellenze TV - Piattaforma Streaming', slug: 'eccellenze-tv-streaming',
      description: 'Piattaforma streaming video per contenuti Made in Italy. Player custom, catalogo, abbonamenti.',
      status: 'IN_PROGRESS', priority: 'HIGH', startDate: daysAgo(120), endDate: daysFromNow(45),
      budgetAmount: 35000, budgetHours: 550, color: '#7C3AED',
    },
  })

  const projCestari = await prisma.project.upsert({
    where: { slug: 'gruppo-cestari-corporate' },
    update: {},
    create: {
      workspaceId: creative.id, clientId: gruppoCestari.id, name: 'Gruppo Cestari - Sito Corporate', slug: 'gruppo-cestari-corporate',
      description: 'Sito corporate gruppo aziendale multiservizi con presentazione divisioni e sezione careers.',
      status: 'IN_PROGRESS', priority: 'MEDIUM', startDate: daysAgo(40), endDate: daysFromNow(30),
      budgetAmount: 6000, budgetHours: 100, color: '#0891B2',
    },
  })

  const projItalafrica = await prisma.project.upsert({
    where: { slug: 'italafrica-sito-corporate' },
    update: {},
    create: {
      workspaceId: creative.id, clientId: italafrica.id, name: 'Italafrica - Sito Corporate', slug: 'italafrica-sito-corporate',
      description: 'Sito corporate multilingua relazioni Italia-Africa. Sezioni news, eventi, partnership.',
      status: 'COMPLETED', priority: 'MEDIUM', startDate: daysAgo(200), endDate: daysAgo(60),
      budgetAmount: 5000, budgetHours: 80, color: '#059669',
    },
  })

  const projUnsic = await prisma.project.upsert({
    where: { slug: 'unsic-portale-sindacale' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: unsic.id, name: 'UNSIC - Portale Sindacale', slug: 'unsic-portale-sindacale',
      description: 'Portale sindacale nazionale con area riservata iscritti, news, documentazione e servizi online.',
      status: 'IN_PROGRESS', priority: 'MEDIUM', startDate: daysAgo(150), endDate: daysFromNow(30),
      budgetAmount: 18000, budgetHours: 350, color: '#2563EB',
    },
  })

  const projBarber99 = await prisma.project.upsert({
    where: { slug: 'barber99-sito-web' },
    update: {},
    create: {
      workspaceId: creative.id, clientId: barber99.id, name: 'Barber99 - Sito Web', slug: 'barber99-sito-web',
      description: 'Sito web barbershop con booking online, gallery lavori, listino prezzi e mappa.',
      status: 'COMPLETED', priority: 'MEDIUM', startDate: daysAgo(120), endDate: daysAgo(45),
      budgetAmount: 3500, budgetHours: 60, color: '#1E293B',
    },
  })

  const projEcolive = await prisma.project.upsert({
    where: { slug: 'ecolive-sito-3d' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: ecolive.id, name: 'Ecolive - Sito Web con 3D', slug: 'ecolive-sito-3d',
      description: 'Sito web case prefabbricate in legno con visualizzatore 3D interattivo dei modelli.',
      status: 'IN_PROGRESS', priority: 'HIGH', startDate: daysAgo(45), endDate: daysFromNow(45),
      budgetAmount: 12000, budgetHours: 200, color: '#16A34A',
    },
  })

  const projGeneralBrokers = await prisma.project.upsert({
    where: { slug: 'general-brokers-sito-vetrina' },
    update: {},
    create: {
      workspaceId: creative.id, clientId: generalBrokers.id, name: 'General Brokers - Sito Vetrina', slug: 'general-brokers-sito-vetrina',
      description: 'Sito vetrina broker assicurativo dal 1977. Presentazione servizi, team e area contatti.',
      status: 'PLANNING', priority: 'LOW', startDate: daysFromNow(7), endDate: daysFromNow(45),
      budgetAmount: 3500, budgetHours: 60, color: '#6366F1',
    },
  })

  const projKinelab = await prisma.project.upsert({
    where: { slug: 'kinelab-sito-booking' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: kinelab.id, name: 'KineLab - Sito e Booking', slug: 'kinelab-sito-booking',
      description: 'Sito studio fisioterapia con sistema di prenotazione e area pazienti.',
      status: 'COMPLETED', priority: 'MEDIUM', startDate: daysAgo(160), endDate: daysAgo(70),
      budgetAmount: 4500, budgetHours: 80, color: '#0EA5E9',
    },
  })

  const projOz = await prisma.project.upsert({
    where: { slug: 'oz-extrait-ecommerce' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: ozExtrait.id, name: 'OZ Extrait - E-commerce', slug: 'oz-extrait-ecommerce',
      description: 'E-commerce profumeria di nicchia con catalogo esclusivo, schede prodotto dettagliate e integrazione Stripe.',
      status: 'IN_PROGRESS', priority: 'HIGH', startDate: daysAgo(30), endDate: daysFromNow(60),
      budgetAmount: 15000, budgetHours: 250, color: '#D946EF',
    },
  })

  const projSpektrum = await prisma.project.upsert({
    where: { slug: 'spektrum-tattoo-sito-booking' },
    update: {},
    create: {
      workspaceId: creative.id, clientId: spektrumTattoo.id, name: 'Spektrum Tattoo - Sito e Booking', slug: 'spektrum-tattoo-sito-booking',
      description: 'Sito studio tatuaggi con portfolio artisti, booking online e sincronizzazione Google Calendar.',
      status: 'IN_PROGRESS', priority: 'MEDIUM', startDate: daysAgo(25), endDate: daysFromNow(35),
      budgetAmount: 5000, budgetHours: 80, color: '#EC4899',
    },
  })

  const projCrmInterno = await prisma.project.upsert({
    where: { slug: 'crm-interno-fodi' },
    update: {},
    create: {
      workspaceId: commerciale.id, clientId: null, name: 'CRM Interno Fodi (FODI-OS)', slug: 'crm-interno-fodi',
      description: 'Piattaforma gestionale interna per CRM, project management, ERP, supporto e knowledge base.',
      status: 'IN_PROGRESS', priority: 'HIGH', startDate: daysAgo(20), endDate: daysFromNow(60),
      budgetHours: 200, color: '#EC4899',
    },
  })

  console.log(`  Project: ${projConfial.name} (Delivery)`)
  console.log(`  Project: ${projFarina.name} (Delivery)`)
  console.log(`  Project: ${projEccellenzeTV.name} (Delivery)`)
  console.log(`  Project: ${projCestari.name} (Creative)`)
  console.log(`  Project: ${projItalafrica.name} (Creative)`)
  console.log(`  Project: ${projUnsic.name} (Delivery)`)
  console.log(`  Project: ${projBarber99.name} (Creative)`)
  console.log(`  Project: ${projEcolive.name} (Delivery)`)
  console.log(`  Project: ${projGeneralBrokers.name} (Creative)`)
  console.log(`  Project: ${projKinelab.name} (Delivery)`)
  console.log(`  Project: ${projOz.name} (Delivery)`)
  console.log(`  Project: ${projSpektrum.name} (Creative)`)
  console.log(`  Project: ${projCrmInterno.name} (Commerciale)`)

  // ============================================================
  // MILESTONES (per i progetti principali in corso)
  // ============================================================
  const msConfial1 = await prisma.milestone.create({
    data: { projectId: projConfial.id, name: 'MVP Corsi Online', dueDate: daysAgo(30), status: 'completed', sortOrder: 1 },
  })
  const msConfial2 = await prisma.milestone.create({
    data: { projectId: projConfial.id, name: 'Modulo Certificazioni', dueDate: daysFromNow(20), status: 'in_progress', sortOrder: 2 },
  })
  await prisma.milestone.create({
    data: { projectId: projConfial.id, name: 'Go Live Produzione', dueDate: daysFromNow(60), status: 'pending', sortOrder: 3 },
  })

  const msEcolive1 = await prisma.milestone.create({
    data: { projectId: projEcolive.id, name: 'Design e Mockup', dueDate: daysAgo(15), status: 'completed', sortOrder: 1 },
  })
  const msEcolive2 = await prisma.milestone.create({
    data: { projectId: projEcolive.id, name: 'Sviluppo Visualizzatore 3D', dueDate: daysFromNow(20), status: 'in_progress', sortOrder: 2 },
  })
  await prisma.milestone.create({
    data: { projectId: projEcolive.id, name: 'Lancio Sito', dueDate: daysFromNow(45), status: 'pending', sortOrder: 3 },
  })

  const msOz1 = await prisma.milestone.create({
    data: { projectId: projOz.id, name: 'Setup E-commerce e Catalogo', dueDate: daysFromNow(15), status: 'in_progress', sortOrder: 1 },
  })
  await prisma.milestone.create({
    data: { projectId: projOz.id, name: 'Integrazione Pagamenti e Go Live', dueDate: daysFromNow(60), status: 'pending', sortOrder: 2 },
  })

  await prisma.milestone.create({
    data: { projectId: projSpektrum.id, name: 'Sito e Portfolio', dueDate: daysFromNow(15), status: 'in_progress', sortOrder: 1 },
  })
  await prisma.milestone.create({
    data: { projectId: projSpektrum.id, name: 'Booking e Calendario', dueDate: daysFromNow(35), status: 'pending', sortOrder: 2 },
  })
  console.log('  Milestones created')

  // ============================================================
  // TASKS (distribuiti tra i progetti attivi)
  // ============================================================
  const [taskConfialSetup, taskConfialCorsi, taskConfialCertificati, taskConfialUpload] = await Promise.all([
    prisma.task.create({ data: { projectId: projConfial.id, milestoneId: msConfial1.id, assigneeId: raffaele.id, creatorId: stefano.id, title: 'Setup infrastruttura LMS', status: 'DONE', priority: 'HIGH', boardColumn: 'done', dueDate: daysAgo(60), completedAt: daysAgo(58), estimatedHours: 16 } }),
    prisma.task.create({ data: { projectId: projConfial.id, milestoneId: msConfial1.id, assigneeId: matar.id, creatorId: stefano.id, title: 'CRUD corsi e lezioni', status: 'DONE', priority: 'HIGH', boardColumn: 'done', dueDate: daysAgo(40), completedAt: daysAgo(38), estimatedHours: 32 } }),
    prisma.task.create({ data: { projectId: projConfial.id, milestoneId: msConfial2.id, assigneeId: raffaele.id, creatorId: stefano.id, title: 'Modulo generazione certificati PDF', status: 'IN_PROGRESS', priority: 'HIGH', boardColumn: 'in_progress', dueDate: daysFromNow(15), estimatedHours: 24 } }),
    prisma.task.create({ data: { projectId: projConfial.id, milestoneId: msConfial2.id, assigneeId: matar.id, creatorId: stefano.id, title: 'Fix upload materiali >50MB', status: 'IN_PROGRESS', priority: 'HIGH', boardColumn: 'in_progress', dueDate: daysFromNow(5), estimatedHours: 8 } }),
  ])

  const [taskEcoliveDesign, taskEcolive3D, taskEcoliveContent] = await Promise.all([
    prisma.task.create({ data: { projectId: projEcolive.id, milestoneId: msEcolive1.id, assigneeId: angelo.id, creatorId: emanuele.id, title: 'Design UI homepage e pagine interne', status: 'DONE', priority: 'HIGH', boardColumn: 'done', dueDate: daysAgo(15), completedAt: daysAgo(16), estimatedHours: 16 } }),
    prisma.task.create({ data: { projectId: projEcolive.id, milestoneId: msEcolive2.id, assigneeId: raffaele.id, creatorId: emanuele.id, title: 'Integrazione visualizzatore 3D Three.js', status: 'IN_PROGRESS', priority: 'HIGH', boardColumn: 'in_progress', dueDate: daysFromNow(15), estimatedHours: 40 } }),
    prisma.task.create({ data: { projectId: projEcolive.id, milestoneId: msEcolive2.id, assigneeId: raffo.id, creatorId: emanuele.id, title: 'Copywriting e contenuti pagine', status: 'IN_PROGRESS', priority: 'MEDIUM', boardColumn: 'in_progress', dueDate: daysFromNow(10), estimatedHours: 12 } }),
  ])

  const [taskOzCatalogo, taskOzStripe] = await Promise.all([
    prisma.task.create({ data: { projectId: projOz.id, milestoneId: msOz1.id, assigneeId: matar.id, creatorId: emanuele.id, title: 'Setup catalogo prodotti e schede', status: 'IN_PROGRESS', priority: 'HIGH', boardColumn: 'in_progress', dueDate: daysFromNow(10), estimatedHours: 24 } }),
    prisma.task.create({ data: { projectId: projOz.id, milestoneId: msOz1.id, assigneeId: raffaele.id, creatorId: emanuele.id, title: 'Integrazione Stripe checkout', status: 'TODO', priority: 'HIGH', boardColumn: 'todo', dueDate: daysFromNow(20), estimatedHours: 16 } }),
  ])

  await Promise.all([
    prisma.task.create({ data: { projectId: projSpektrum.id, assigneeId: angelo.id, creatorId: emanuele.id, title: 'Design portfolio artisti', status: 'IN_PROGRESS', priority: 'MEDIUM', boardColumn: 'in_progress', dueDate: daysFromNow(10), estimatedHours: 12 } }),
    prisma.task.create({ data: { projectId: projSpektrum.id, assigneeId: matar.id, creatorId: emanuele.id, title: 'Sistema booking con Google Calendar', status: 'TODO', priority: 'HIGH', boardColumn: 'todo', dueDate: daysFromNow(25), estimatedHours: 20 } }),
  ])

  const [taskCrmPipeline] = await Promise.all([
    prisma.task.create({ data: { projectId: projCrmInterno.id, assigneeId: riccardo.id, creatorId: emanuele.id, title: 'Definizione pipeline e status CRM', status: 'DONE', priority: 'HIGH', boardColumn: 'done', dueDate: daysAgo(10), completedAt: daysAgo(8), estimatedHours: 4 } }),
    prisma.task.create({ data: { projectId: projCrmInterno.id, assigneeId: riccardo.id, creatorId: emanuele.id, title: 'Import clienti esistenti', status: 'IN_PROGRESS', priority: 'MEDIUM', boardColumn: 'in_progress', dueDate: daysFromNow(5), estimatedHours: 6 } }),
  ])

  await Promise.all([
    prisma.task.create({ data: { projectId: projCestari.id, assigneeId: raffo.id, creatorId: emanuele.id, title: 'Raccolta contenuti divisioni aziendali', status: 'IN_PROGRESS', priority: 'MEDIUM', boardColumn: 'in_progress', dueDate: daysFromNow(10), estimatedHours: 8 } }),
    prisma.task.create({ data: { projectId: projCestari.id, assigneeId: angelo.id, creatorId: emanuele.id, title: 'Design sezione Careers', status: 'TODO', priority: 'LOW', boardColumn: 'todo', dueDate: daysFromNow(20), estimatedHours: 12 } }),
  ])
  console.log('  Tasks created (16)')

  // ============================================================
  // TIME ENTRIES (linked to tasks)
  // ============================================================
  await prisma.timeEntry.createMany({
    data: [
      // Confial
      { userId: raffaele.id, projectId: projConfial.id, taskId: taskConfialSetup.id, date: daysAgo(60), hours: 8, description: 'Setup infrastruttura LMS, Docker, CI/CD', billable: true },
      { userId: raffaele.id, projectId: projConfial.id, taskId: taskConfialSetup.id, date: daysAgo(58), hours: 8, description: 'Configurazione DB, auth, API base', billable: true },
      { userId: matar.id, projectId: projConfial.id, taskId: taskConfialCorsi.id, date: daysAgo(45), hours: 8, description: 'CRUD corsi, modello dati lezioni', billable: true },
      { userId: matar.id, projectId: projConfial.id, taskId: taskConfialCorsi.id, date: daysAgo(40), hours: 8, description: 'Player video, tracking progresso', billable: true },
      { userId: raffaele.id, projectId: projConfial.id, taskId: taskConfialCertificati.id, date: daysAgo(5), hours: 6, description: 'Setup template PDF certificati', billable: true },
      // Ecolive
      { userId: angelo.id, projectId: projEcolive.id, taskId: taskEcoliveDesign.id, date: daysAgo(20), hours: 8, description: 'Design homepage, palette colori, tipografia', billable: true },
      { userId: angelo.id, projectId: projEcolive.id, taskId: taskEcoliveDesign.id, date: daysAgo(18), hours: 8, description: 'Pagine interne, responsive breakpoints', billable: true },
      { userId: raffaele.id, projectId: projEcolive.id, taskId: taskEcolive3D.id, date: daysAgo(8), hours: 6, description: 'Setup Three.js, caricamento modelli GLB', billable: true },
      { userId: raffaele.id, projectId: projEcolive.id, taskId: taskEcolive3D.id, date: daysAgo(3), hours: 8, description: 'Controlli camera, illuminazione, responsive', billable: true },
      // OZ Extrait
      { userId: matar.id, projectId: projOz.id, taskId: taskOzCatalogo.id, date: daysAgo(10), hours: 6, description: 'Schema DB prodotti, categorie, varianti', billable: true },
      { userId: matar.id, projectId: projOz.id, taskId: taskOzCatalogo.id, date: daysAgo(5), hours: 8, description: 'CRUD prodotti, upload immagini', billable: true },
      // CRM Interno
      { userId: riccardo.id, projectId: projCrmInterno.id, taskId: taskCrmPipeline.id, date: daysAgo(10), hours: 4, description: 'Definizione pipeline CRM con team', billable: false },
      // Ecolive content
      { userId: raffo.id, projectId: projEcolive.id, taskId: taskEcoliveContent.id, date: daysAgo(5), hours: 4, description: 'Copywriting homepage e about', billable: true },
      // Stefano PM
      { userId: stefano.id, projectId: projConfial.id, date: daysAgo(14), hours: 3, description: 'Sprint review + planning Confial', billable: false },
      { userId: stefano.id, projectId: projEcolive.id, date: daysAgo(7), hours: 2, description: 'Call review Ecolive con cliente', billable: false },
    ],
    skipDuplicates: true,
  })
  console.log('  Time entries created\n')

  // ============================================================
  // QUOTES (4 preventivi reali)
  // ============================================================
  const quote1 = await prisma.quote.create({
    data: {
      clientId: confial.id, projectId: projConfial.id, creatorId: emanuele.id,
      number: 'PRV-2026-001', title: 'Piattaforma Formazione FAILMS', status: 'APPROVED',
      subtotal: 22950.82, taxRate: 22, taxAmount: 5049.18, total: 28000, discount: 0,
      validUntil: daysAgo(30), sentAt: daysAgo(95), approvedAt: daysAgo(90),
      notes: 'Preventivo per sviluppo piattaforma LMS formazione sindacale. Approvato.',
    },
  })
  await prisma.quoteLineItem.createMany({
    data: [
      { quoteId: quote1.id, description: 'Analisi requisiti e architettura', quantity: 1, unitPrice: 4000, total: 4000, sortOrder: 1 },
      { quoteId: quote1.id, description: 'Sviluppo modulo corsi e lezioni', quantity: 200, unitPrice: 50, total: 10000, sortOrder: 2 },
      { quoteId: quote1.id, description: 'Modulo certificazioni e tracking', quantity: 100, unitPrice: 55, total: 5500, sortOrder: 3 },
      { quoteId: quote1.id, description: 'Area docenti e amministrazione', quantity: 60, unitPrice: 50, total: 3000, sortOrder: 4 },
      { quoteId: quote1.id, description: 'Testing, QA e deploy', quantity: 1, unitPrice: 450.82, total: 450.82, sortOrder: 5 },
    ],
  })

  const quote2 = await prisma.quote.create({
    data: {
      clientId: ecolive.id, projectId: projEcolive.id, creatorId: emanuele.id,
      number: 'PRV-2026-002', title: 'Sito Web Ecolive con Visualizzatore 3D', status: 'SENT',
      subtotal: 9836.07, taxRate: 22, taxAmount: 2163.93, total: 12000, discount: 0,
      validUntil: daysFromNow(15), sentAt: daysAgo(40),
      notes: 'Preventivo per sito web con visualizzatore 3D interattivo case prefabbricate.',
    },
  })
  await prisma.quoteLineItem.createMany({
    data: [
      { quoteId: quote2.id, description: 'Design UX/UI e prototipo Figma', quantity: 1, unitPrice: 2000, total: 2000, sortOrder: 1 },
      { quoteId: quote2.id, description: 'Sviluppo frontend Next.js', quantity: 80, unitPrice: 50, total: 4000, sortOrder: 2 },
      { quoteId: quote2.id, description: 'Visualizzatore 3D Three.js', quantity: 40, unitPrice: 60, total: 2400, sortOrder: 3 },
      { quoteId: quote2.id, description: 'Ottimizzazione e SEO', quantity: 1, unitPrice: 1436.07, total: 1436.07, sortOrder: 4 },
    ],
  })

  const quote3 = await prisma.quote.create({
    data: {
      clientId: generalBrokers.id, creatorId: riccardo.id,
      number: 'PRV-2026-003', title: 'Sito Vetrina General Brokers SRL', status: 'DRAFT',
      subtotal: 2868.85, taxRate: 22, taxAmount: 631.15, total: 3500, discount: 0,
      validUntil: daysFromNow(30),
      notes: 'Bozza preventivo sito vetrina broker assicurativo.',
    },
  })
  await prisma.quoteLineItem.createMany({
    data: [
      { quoteId: quote3.id, description: 'Design UX/UI responsive', quantity: 1, unitPrice: 800, total: 800, sortOrder: 1 },
      { quoteId: quote3.id, description: 'Sviluppo sito (5 pagine)', quantity: 30, unitPrice: 50, total: 1500, sortOrder: 2 },
      { quoteId: quote3.id, description: 'Form contatti e area riservata', quantity: 1, unitPrice: 568.85, total: 568.85, sortOrder: 3 },
    ],
  })

  const quote4 = await prisma.quote.create({
    data: {
      clientId: ozExtrait.id, projectId: projOz.id, creatorId: emanuele.id,
      number: 'PRV-2026-004', title: 'E-commerce OZ Extrait Profumeria', status: 'SENT',
      subtotal: 12295.08, taxRate: 22, taxAmount: 2704.92, total: 15000, discount: 0,
      validUntil: daysFromNow(20), sentAt: daysAgo(25),
      notes: 'Preventivo per e-commerce profumeria di nicchia con integrazione Stripe.',
    },
  })
  await prisma.quoteLineItem.createMany({
    data: [
      { quoteId: quote4.id, description: 'Design e-commerce luxury', quantity: 1, unitPrice: 2500, total: 2500, sortOrder: 1 },
      { quoteId: quote4.id, description: 'Sviluppo catalogo e schede prodotto', quantity: 100, unitPrice: 50, total: 5000, sortOrder: 2 },
      { quoteId: quote4.id, description: 'Integrazione Stripe + checkout', quantity: 40, unitPrice: 55, total: 2200, sortOrder: 3 },
      { quoteId: quote4.id, description: 'Area utente, ordini, wishlist', quantity: 40, unitPrice: 50, total: 2000, sortOrder: 4 },
      { quoteId: quote4.id, description: 'SEO e ottimizzazione performance', quantity: 1, unitPrice: 595.08, total: 595.08, sortOrder: 5 },
    ],
  })
  console.log('  Quotes created (4: APPROVED + 2 SENT + DRAFT)')

  // ============================================================
  // EXPENSES (spese reali)
  // ============================================================
  await prisma.expense.createMany({
    data: [
      // VPS Hostinger x2
      { category: 'hosting', description: 'VPS Hostinger fodivps1.cloud (mensile)', amount: 29.99, date: daysAgo(15) },
      { category: 'hosting', description: 'VPS Hostinger fodivps2.cloud (mensile)', amount: 29.99, date: daysAgo(15) },
      // Domini
      { category: 'dominio', description: 'Rinnovo dominio barber99.it', amount: 12.50, date: daysAgo(45) },
      { category: 'dominio', description: 'Rinnovo dominio ecolive.srl', amount: 15.00, date: daysAgo(30) },
      { category: 'dominio', description: 'Rinnovo dominio fodivps2.cloud', amount: 10.00, date: daysAgo(60) },
      // Software
      { category: 'software', description: 'Figma Team (mensile)', amount: 45, date: daysAgo(10) },
      { category: 'software', description: 'GitHub Team (mensile)', amount: 19, date: daysAgo(10) },
      { category: 'software', description: 'Cloudflare Pro (mensile)', amount: 20, date: daysAgo(10) },
      { category: 'software', description: 'Google Workspace (mensile)', amount: 12, date: daysAgo(10) },
    ],
    skipDuplicates: true,
  })
  console.log('  Expenses created (9)')

  // ============================================================
  // WIKI PAGES (5 generiche, mantenute)
  // ============================================================
  const wikiSOP = await prisma.wikiPage.create({
    data: {
      title: 'Procedure Operative Standard', slug: 'procedure-operative',
      content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Procedure Operative Standard' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Questa pagina raccoglie tutte le procedure standard del team.' }] }] },
      contentText: 'Procedure Operative Standard. Questa pagina raccoglie tutte le procedure standard del team.',
      category: 'procedures', icon: 'clipboard-list', sortOrder: 1,
    },
  })

  await prisma.wikiPage.create({
    data: {
      parentId: wikiSOP.id,
      title: 'Guida Onboarding Nuovo Progetto', slug: 'onboarding-progetto',
      content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Guida Onboarding Nuovo Progetto' }] }, { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Creare repository GitHub' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Setup Docker + CI/CD' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Configurare DNS e SSL' }] }] }] }] },
      contentText: 'Guida Onboarding Nuovo Progetto. 1. Creare repository GitHub 2. Setup Docker + CI/CD 3. Configurare DNS e SSL',
      category: 'procedures', icon: 'rocket', sortOrder: 1,
    },
  })

  await prisma.wikiPage.create({
    data: {
      parentId: wikiSOP.id,
      title: 'Gestione Ticket e Supporto', slug: 'gestione-ticket',
      content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Gestione Ticket e Supporto' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Procedura per la gestione dei ticket di supporto clienti.' }] }] },
      contentText: 'Gestione Ticket e Supporto. Procedura per la gestione dei ticket di supporto clienti.',
      category: 'procedures', icon: 'headphones', sortOrder: 2,
    },
  })

  await prisma.wikiPage.create({
    data: {
      title: 'Snippet e Utility', slug: 'snippet-utility',
      content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Snippet e Utility' }] }, { type: 'codeBlock', attrs: { language: 'typescript' }, content: [{ type: 'text', text: 'export function formatCurrency(amount: number): string {\n  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount)\n}' }] }] },
      contentText: 'Snippet e Utility. Raccolta di codice riutilizzabile.',
      category: 'development', icon: 'code', sortOrder: 2,
    },
  })

  await prisma.wikiPage.create({
    data: {
      title: 'Guida Ambiente di Sviluppo', slug: 'guida-ambiente-sviluppo',
      content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Guida Ambiente di Sviluppo' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Requisiti: Node.js 24+, Docker, pnpm. Clonare il repo, copiare .env.example, eseguire pnpm install e pnpm dev.' }] }] },
      contentText: 'Guida Ambiente di Sviluppo. Requisiti: Node.js 24+, Docker, pnpm.',
      category: 'development', icon: 'laptop', sortOrder: 3,
    },
  })
  console.log('  Wiki pages created (5)\n')

  // ============================================================
  // TICKETS (6 basati su problemi reali)
  // ============================================================
  await prisma.ticket.createMany({
    data: [
      { clientId: barber99.id, projectId: projBarber99.id, creatorId: chiara.id, number: 'TKT-001', subject: 'Aggiornamento orari apertura', description: 'Luca richiede aggiornamento orari apertura: chiusura lunedi, apertura sabato alle 8:30 invece delle 9:00.', status: 'RESOLVED', priority: 'LOW', category: 'content', resolvedAt: daysAgo(7) },
      { clientId: confial.id, projectId: projConfial.id, creatorId: chiara.id, assigneeId: matar.id, number: 'TKT-002', subject: 'Problema upload certificati >50MB', description: 'Roberto Mancuso segnala che il caricamento di materiali didattici sopra i 50MB fallisce con errore 413. Urgente per i nuovi corsi.', status: 'IN_PROGRESS', priority: 'HIGH', category: 'bug' },
      { clientId: ecolive.id, projectId: projEcolive.id, creatorId: chiara.id, assigneeId: raffaele.id, number: 'TKT-003', subject: 'Visualizzatore 3D lento su mobile', description: 'Dominik riporta che il visualizzatore 3D e molto lento su iPhone e Android. I modelli impiegano >10s a caricarsi.', status: 'OPEN', priority: 'MEDIUM', category: 'performance' },
      { clientId: gruppoCestari.id, projectId: projCestari.id, creatorId: chiara.id, number: 'TKT-004', subject: 'Richiesta nuova pagina Careers', description: 'Lorenzo Cestari richiede aggiunta di una sezione "Lavora con noi" con form candidatura e posizioni aperte.', status: 'OPEN', priority: 'LOW', category: 'feature' },
      { clientId: ozExtrait.id, projectId: projOz.id, creatorId: chiara.id, assigneeId: raffaele.id, number: 'TKT-005', subject: 'Errore pagamento Stripe', description: 'Alessia Morandi segnala che alcuni clienti ricevono errore durante il checkout con carte Visa. Errore "card_declined" anche su carte valide.', status: 'IN_PROGRESS', priority: 'URGENT', category: 'bug' },
      { clientId: spektrumTattoo.id, projectId: projSpektrum.id, creatorId: chiara.id, number: 'TKT-006', subject: 'Sincronizzazione calendario booking', description: 'Daniele Greco chiede che le prenotazioni dal sito si sincronizzino automaticamente con il suo Google Calendar personale e quello dello studio.', status: 'WAITING_CLIENT', priority: 'MEDIUM', category: 'feature' },
    ],
    skipDuplicates: true,
  })
  console.log('  Tickets created (6)')

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  await prisma.notification.createMany({
    data: [
      { userId: emanuele.id, type: 'quote_approved', title: 'Preventivo approvato', message: 'Il preventivo PRV-2026-001 per Confial/FAILMS e stato approvato (28.000 EUR).', link: '/erp/quotes' },
      { userId: emanuele.id, type: 'quote_sent', title: 'Preventivo inviato', message: 'Il preventivo PRV-2026-002 per Ecolive e stato inviato.', link: '/erp/quotes' },
      { userId: stefano.id, type: 'task_completed', title: 'Task completato', message: 'Raffaele ha completato "Setup infrastruttura LMS" per Confial.', link: '/projects' },
      { userId: raffaele.id, type: 'ticket_assigned', title: 'Ticket assegnato', message: 'Ti e stato assegnato il ticket TKT-005: Errore pagamento Stripe (URGENT).', link: '/support' },
      { userId: matar.id, type: 'ticket_assigned', title: 'Ticket assegnato', message: 'Ti e stato assegnato il ticket TKT-002: Problema upload certificati.', link: '/support' },
      { userId: emanuele.id, type: 'project_update', title: 'Nuovo progetto', message: 'Il progetto "OZ Extrait - E-commerce" e stato avviato.', link: '/projects', isRead: true },
      { userId: chiara.id, type: 'ticket_resolved', title: 'Ticket risolto', message: 'Il ticket TKT-001 (Barber99 - Orari apertura) e stato risolto.', link: '/support', isRead: true },
      { userId: riccardo.id, type: 'client_update', title: 'Nuovo prospect', message: 'SaaS Generali aggiunto come prospect.', link: '/crm' },
      { userId: angelo.id, type: 'task_assigned', title: 'Task assegnato', message: 'Ti e stato assegnato "Design sezione Careers" per Gruppo Cestari.', link: '/projects' },
      { userId: raffo.id, type: 'task_assigned', title: 'Task assegnato', message: 'Ti e stato assegnato "Copywriting contenuti Ecolive".', link: '/projects' },
    ],
    skipDuplicates: true,
  })
  console.log('  Notifications created')

  // ============================================================
  // ACTIVITY LOGS
  // ============================================================
  await prisma.activityLog.createMany({
    data: [
      { userId: emanuele.id, action: 'create', entityType: 'project', entityId: projConfial.id, metadata: { name: 'FAILMS - Piattaforma Formazione' }, createdAt: daysAgo(90) },
      { userId: emanuele.id, action: 'create', entityType: 'project', entityId: projEcolive.id, metadata: { name: 'Ecolive - Sito Web con 3D' }, createdAt: daysAgo(45) },
      { userId: emanuele.id, action: 'create', entityType: 'project', entityId: projOz.id, metadata: { name: 'OZ Extrait - E-commerce' }, createdAt: daysAgo(30) },
      { userId: emanuele.id, action: 'create', entityType: 'quote', entityId: quote1.id, metadata: { number: 'PRV-2026-001' }, createdAt: daysAgo(95) },
      { userId: emanuele.id, action: 'approve', entityType: 'quote', entityId: quote1.id, metadata: { number: 'PRV-2026-001', total: 28000 }, createdAt: daysAgo(90) },
      { userId: emanuele.id, action: 'create', entityType: 'quote', entityId: quote2.id, metadata: { number: 'PRV-2026-002' }, createdAt: daysAgo(40) },
      { userId: riccardo.id, action: 'create', entityType: 'client', entityId: saasGenerali.id, metadata: { name: 'SaaS Generali' }, createdAt: daysAgo(15) },
      { userId: raffaele.id, action: 'complete', entityType: 'task', entityId: taskConfialSetup.id, metadata: { title: 'Setup infrastruttura LMS' }, createdAt: daysAgo(58) },
      { userId: stefano.id, action: 'update', entityType: 'project', entityId: projConfial.id, metadata: { field: 'status', value: 'IN_PROGRESS' }, createdAt: daysAgo(85) },
      { userId: chiara.id, action: 'resolve', entityType: 'ticket', entityId: 'seed-tkt-001', metadata: { number: 'TKT-001', subject: 'Aggiornamento orari apertura' }, createdAt: daysAgo(7) },
    ],
    skipDuplicates: true,
  })
  console.log('  Activity logs created')

  console.log(`\nSeed completed!`)
  console.log(`  Default password: ${DEFAULT_PASSWORD}`)
  console.log(`  Users: ${usersData.length}, Clients: ${clientsData.length}`)
  console.log(`  Projects: 13, Tasks: 16, Quotes: 4, Expenses: 9, Wiki: 5, Tickets: 6`)

  await pool.end()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
