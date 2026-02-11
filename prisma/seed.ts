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
  // CLIENTS (5 demo: 2 ACTIVE, 1 LEAD, 1 PROSPECT, 1 INACTIVE)
  // ============================================================
  const clientsData = [
    { companyName: 'TechVision Srl', slug: 'techvision', vatNumber: 'IT12345678901', pec: 'admin@pec.techvision.it', sdi: 'ABC1234', website: 'https://techvision.it', industry: 'Software', source: 'Referral', status: 'ACTIVE' as const, notes: 'Cliente storico, contratto annuale', tags: ['tech', 'enterprise'] },
    { companyName: 'BarberShop Milano', slug: 'barbershop-milano', vatNumber: 'IT98765432109', industry: 'Beauty', source: 'Google', status: 'ACTIVE' as const, notes: 'Sito web + gestione social', tags: ['beauty', 'local'] },
    { companyName: 'GreenBuild Costruzioni', slug: 'greenbuild', vatNumber: 'IT55566677789', pec: 'info@pec.greenbuild.it', sdi: 'XYZ9876', industry: 'Edilizia', source: 'Fiera', status: 'PROSPECT' as const, notes: 'Interessati a sito web e CRM', tags: ['edilizia', 'prospect'] },
    { companyName: 'Ristorante Da Luigi', slug: 'ristorante-da-luigi', industry: 'Ristorazione', source: 'Passaparola', status: 'LEAD' as const, notes: 'Primo contatto tramite Riccardo', tags: ['food', 'local'] },
    { companyName: 'SportMax Academy', slug: 'sportmax-academy', vatNumber: 'IT11122233344', website: 'https://sportmax.it', industry: 'Sport', source: 'LinkedIn', status: 'INACTIVE' as const, notes: 'Ex cliente, progetto completato', tags: ['sport', 'formazione'] },
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

  const [techvision, barbershop, greenbuild, daluigi, sportmax] = clients

  // ============================================================
  // CONTACTS (2 per cliente)
  // ============================================================
  await prisma.contact.createMany({
    data: [
      // TechVision
      { clientId: techvision.id, firstName: 'Marco', lastName: 'Rossi', email: 'marco.rossi@techvision.it', phone: '+39 333 1234567', role: 'CEO', isPrimary: true },
      { clientId: techvision.id, firstName: 'Laura', lastName: 'Bianchi', email: 'laura.bianchi@techvision.it', phone: '+39 333 9876543', role: 'CTO', isPrimary: false },
      // BarberShop
      { clientId: barbershop.id, firstName: 'Giuseppe', lastName: 'Verdi', email: 'giuseppe@barbershop.it', phone: '+39 347 5551234', role: 'Titolare', isPrimary: true },
      { clientId: barbershop.id, firstName: 'Francesca', lastName: 'Neri', email: 'francesca@barbershop.it', phone: '+39 347 5559876', role: 'Social Manager', isPrimary: false },
      // GreenBuild
      { clientId: greenbuild.id, firstName: 'Anna', lastName: 'Colombo', email: 'anna@greenbuild.it', phone: '+39 340 6667890', role: 'Marketing Manager', isPrimary: true },
      { clientId: greenbuild.id, firstName: 'Paolo', lastName: 'Romano', email: 'paolo@greenbuild.it', phone: '+39 340 6661234', role: 'Direttore Tecnico', isPrimary: false },
      // Da Luigi
      { clientId: daluigi.id, firstName: 'Luigi', lastName: 'Esposito', phone: '+39 392 1112233', role: 'Titolare', isPrimary: true },
      { clientId: daluigi.id, firstName: 'Maria', lastName: 'Esposito', phone: '+39 392 1114455', role: 'Co-Titolare', isPrimary: false },
      // SportMax
      { clientId: sportmax.id, firstName: 'Diego', lastName: 'Ferrari', email: 'diego@sportmax.it', phone: '+39 345 4445566', role: 'Direttore', isPrimary: true },
      { clientId: sportmax.id, firstName: 'Sara', lastName: 'Conti', email: 'sara@sportmax.it', phone: '+39 345 4447788', role: 'Responsabile Corsi', isPrimary: false },
    ],
    skipDuplicates: true,
  })
  console.log('  Contacts created (2 per client)')

  // ============================================================
  // INTERACTIONS (3 per i primi 2 clienti)
  // ============================================================
  await prisma.interaction.createMany({
    data: [
      // TechVision (3)
      { clientId: techvision.id, type: 'MEETING', subject: 'Kickoff nuovo progetto', content: 'Discusso requisiti per piattaforma interna. Budget approvato.', date: daysAgo(30) },
      { clientId: techvision.id, type: 'EMAIL', subject: 'Invio preventivo aggiornamento', content: 'Preventivo per nuove funzionalita aggiornato e inviato.', date: daysAgo(15) },
      { clientId: techvision.id, type: 'CALL', subject: 'Review sprint settimanale', content: 'Sprint review con il team TechVision. Feedback positivo sulla dashboard.', date: daysAgo(3) },
      // BarberShop (3)
      { clientId: barbershop.id, type: 'CALL', subject: 'Check mensile sito web', content: 'Tutto ok, richiesta aggiunta sezione promozioni.', date: daysAgo(7) },
      { clientId: barbershop.id, type: 'WHATSAPP', subject: 'Nuove foto per sito', content: 'Giuseppe ha inviato le nuove foto del negozio per il restyling.', date: daysAgo(5) },
      { clientId: barbershop.id, type: 'MEETING', subject: 'Presentazione mockup', content: 'Presentati i mockup del nuovo sito. Approvati con modifiche minori.', date: daysAgo(2) },
      // GreenBuild (1)
      { clientId: greenbuild.id, type: 'MEETING', subject: 'Presentazione servizi', content: 'Presentazione portfolio e servizi. Molto interessati al CRM.', date: daysAgo(5) },
      // Da Luigi (1)
      { clientId: daluigi.id, type: 'CALL', subject: 'Primo contatto', content: 'Contatto referral da Riccardo. Cerca sito web semplice con menu e prenotazioni.', date: daysAgo(2) },
      // SportMax (1)
      { clientId: sportmax.id, type: 'NOTE', subject: 'Progetto completato', content: 'Progetto app consegnato. Cliente soddisfatto ma non rinnova manutenzione.', date: daysAgo(60) },
    ],
    skipDuplicates: true,
  })
  console.log('  Interactions created\n')

  // ============================================================
  // PROJECTS (3: uno per workspace)
  // ============================================================
  const projTechvision = await prisma.project.upsert({
    where: { slug: 'gestionale-techvision' },
    update: {},
    create: {
      workspaceId: delivery.id, clientId: techvision.id, name: 'Piattaforma Gestionale TechVision', slug: 'gestionale-techvision',
      description: 'Sviluppo piattaforma gestionale interna per TechVision Srl. Include dashboard, gestione ordini, reportistica.',
      status: 'IN_PROGRESS', priority: 'HIGH', startDate: daysAgo(45), endDate: daysFromNow(60),
      budgetAmount: 25000, budgetHours: 400, color: '#3B82F6',
    },
  })

  const projBarbershop = await prisma.project.upsert({
    where: { slug: 'restyling-barbershop' },
    update: {},
    create: {
      workspaceId: creative.id, clientId: barbershop.id, name: 'Restyling Sito BarberShop', slug: 'restyling-barbershop',
      description: 'Redesign completo del sito web con nuova sezione promozioni, booking online e integrazione social.',
      status: 'PLANNING', priority: 'MEDIUM', startDate: daysFromNow(7), endDate: daysFromNow(45),
      budgetAmount: 5000, budgetHours: 80, color: '#F59E0B',
    },
  })

  const projCommerciale = await prisma.project.upsert({
    where: { slug: 'crm-interno-fodi' },
    update: {},
    create: {
      workspaceId: commerciale.id, clientId: null, name: 'CRM Interno Fodi', slug: 'crm-interno-fodi',
      description: 'Implementazione sistema CRM interno per gestione lead, pipeline e follow-up commerciale.',
      status: 'IN_PROGRESS', priority: 'MEDIUM', startDate: daysAgo(20), endDate: daysFromNow(30),
      budgetHours: 120, color: '#EC4899',
    },
  })

  console.log(`  Project: ${projTechvision.name} (Delivery)`)
  console.log(`  Project: ${projBarbershop.name} (Creative)`)
  console.log(`  Project: ${projCommerciale.name} (Commerciale)`)

  // ============================================================
  // MILESTONES
  // ============================================================
  const ms1 = await prisma.milestone.create({
    data: { projectId: projTechvision.id, name: 'MVP Dashboard', dueDate: daysFromNow(15), status: 'in_progress', sortOrder: 1 },
  })
  const ms2 = await prisma.milestone.create({
    data: { projectId: projTechvision.id, name: 'Modulo Ordini', dueDate: daysFromNow(40), status: 'pending', sortOrder: 2 },
  })
  await prisma.milestone.create({
    data: { projectId: projTechvision.id, name: 'Go Live', dueDate: daysFromNow(60), status: 'pending', sortOrder: 3 },
  })
  await prisma.milestone.create({
    data: { projectId: projBarbershop.id, name: 'Design Approvato', dueDate: daysFromNow(14), status: 'pending', sortOrder: 1 },
  })
  await prisma.milestone.create({
    data: { projectId: projBarbershop.id, name: 'Sito Online', dueDate: daysFromNow(40), status: 'pending', sortOrder: 2 },
  })
  console.log('  Milestones created')

  // ============================================================
  // TASKS (10 distribuiti, mix di status TODO/IN_PROGRESS/DONE)
  // ============================================================
  const [taskSetup, taskAuth, taskDashboard, taskApiOrdini, taskFrontendOrdini] = await Promise.all([
    prisma.task.create({ data: { projectId: projTechvision.id, milestoneId: ms1.id, assigneeId: raffaele.id, creatorId: stefano.id, title: 'Setup progetto Next.js + Prisma', status: 'DONE', priority: 'HIGH', boardColumn: 'done', dueDate: daysAgo(30), completedAt: daysAgo(28), estimatedHours: 8 } }),
    prisma.task.create({ data: { projectId: projTechvision.id, milestoneId: ms1.id, assigneeId: raffaele.id, creatorId: stefano.id, title: 'Implementazione autenticazione JWT', status: 'DONE', priority: 'HIGH', boardColumn: 'done', dueDate: daysAgo(20), completedAt: daysAgo(18), estimatedHours: 16 } }),
    prisma.task.create({ data: { projectId: projTechvision.id, milestoneId: ms1.id, assigneeId: matar.id, creatorId: stefano.id, title: 'Dashboard KPI con grafici', status: 'IN_PROGRESS', priority: 'HIGH', boardColumn: 'in_progress', dueDate: daysFromNow(10), estimatedHours: 24 } }),
    prisma.task.create({ data: { projectId: projTechvision.id, milestoneId: ms2.id, assigneeId: raffaele.id, creatorId: stefano.id, title: 'API CRUD ordini', status: 'TODO', priority: 'HIGH', boardColumn: 'todo', dueDate: daysFromNow(25), estimatedHours: 32 } }),
    prisma.task.create({ data: { projectId: projTechvision.id, milestoneId: ms2.id, assigneeId: matar.id, creatorId: stefano.id, title: 'Frontend lista ordini + filtri', status: 'TODO', priority: 'MEDIUM', boardColumn: 'todo', dueDate: daysFromNow(30), estimatedHours: 24 } }),
  ])
  const [, , , taskPipeline] = await Promise.all([
    prisma.task.create({ data: { projectId: projBarbershop.id, assigneeId: raffo.id, creatorId: emanuele.id, title: 'Raccolta contenuti e foto', status: 'IN_PROGRESS', priority: 'HIGH', boardColumn: 'in_progress', dueDate: daysFromNow(10), estimatedHours: 8 } }),
    prisma.task.create({ data: { projectId: projBarbershop.id, assigneeId: angelo.id, creatorId: emanuele.id, title: 'Wireframe e mockup Figma', status: 'TODO', priority: 'HIGH', boardColumn: 'todo', dueDate: daysFromNow(14), estimatedHours: 16 } }),
    prisma.task.create({ data: { projectId: projBarbershop.id, assigneeId: angelo.id, creatorId: emanuele.id, title: 'Sviluppo frontend responsive', status: 'TODO', priority: 'MEDIUM', boardColumn: 'todo', dueDate: daysFromNow(30), estimatedHours: 24 } }),
    prisma.task.create({ data: { projectId: projCommerciale.id, assigneeId: riccardo.id, creatorId: emanuele.id, title: 'Definizione pipeline e status CRM', status: 'DONE', priority: 'HIGH', boardColumn: 'done', dueDate: daysAgo(10), completedAt: daysAgo(8), estimatedHours: 4 } }),
    prisma.task.create({ data: { projectId: projCommerciale.id, assigneeId: riccardo.id, creatorId: emanuele.id, title: 'Import lead da foglio Excel', status: 'IN_PROGRESS', priority: 'MEDIUM', boardColumn: 'in_progress', dueDate: daysFromNow(5), estimatedHours: 6 } }),
  ])
  console.log('  Tasks created (10)')

  // ============================================================
  // TIME ENTRIES (linked to tasks)
  // ============================================================
  await prisma.timeEntry.createMany({
    data: [
      { userId: raffaele.id, projectId: projTechvision.id, taskId: taskSetup.id, date: daysAgo(30), hours: 6, description: 'Setup progetto, configurazione Docker', billable: true },
      { userId: raffaele.id, projectId: projTechvision.id, taskId: taskAuth.id, date: daysAgo(28), hours: 8, description: 'Implementazione auth JWT + middleware', billable: true },
      { userId: raffaele.id, projectId: projTechvision.id, taskId: taskAuth.id, date: daysAgo(20), hours: 7, description: 'API autenticazione + refresh token', billable: true },
      { userId: matar.id, projectId: projTechvision.id, taskId: taskDashboard.id, date: daysAgo(10), hours: 6, description: 'Setup Recharts + primi grafici KPI', billable: true },
      { userId: matar.id, projectId: projTechvision.id, taskId: taskDashboard.id, date: daysAgo(5), hours: 8, description: 'Dashboard layout e card metriche', billable: true },
      { userId: angelo.id, projectId: projTechvision.id, taskId: taskDashboard.id, date: daysAgo(8), hours: 5, description: 'Design system: Button, Card, Badge, Input', billable: true },
      { userId: stefano.id, projectId: projTechvision.id, date: daysAgo(14), hours: 3, description: 'Review sprint + planning', billable: false },
      { userId: riccardo.id, projectId: projCommerciale.id, taskId: taskPipeline.id, date: daysAgo(10), hours: 4, description: 'Definizione pipeline CRM con team', billable: false },
    ],
    skipDuplicates: true,
  })
  console.log('  Time entries created\n')

  // ============================================================
  // QUOTES (1 DRAFT, 1 SENT)
  // ============================================================
  const quote1 = await prisma.quote.create({
    data: {
      clientId: techvision.id, projectId: projTechvision.id, creatorId: emanuele.id,
      number: 'PRV-2026-001', title: 'Piattaforma Gestionale TechVision', status: 'SENT',
      subtotal: 20491.80, taxRate: 22, taxAmount: 4508.20, total: 25000, discount: 0,
      validUntil: daysFromNow(30), sentAt: daysAgo(5),
      notes: 'Preventivo per sviluppo piattaforma gestionale completa.',
    },
  })
  await prisma.quoteLineItem.createMany({
    data: [
      { quoteId: quote1.id, description: 'Analisi requisiti e progettazione', quantity: 1, unitPrice: 3000, total: 3000, sortOrder: 1 },
      { quoteId: quote1.id, description: 'Sviluppo frontend (Next.js)', quantity: 200, unitPrice: 50, total: 10000, sortOrder: 2 },
      { quoteId: quote1.id, description: 'Sviluppo backend (API + DB)', quantity: 120, unitPrice: 55, total: 6600, sortOrder: 3 },
      { quoteId: quote1.id, description: 'Testing e QA', quantity: 1, unitPrice: 891.80, total: 891.80, sortOrder: 4 },
    ],
  })

  const quote2 = await prisma.quote.create({
    data: {
      clientId: barbershop.id, projectId: projBarbershop.id, creatorId: riccardo.id,
      number: 'PRV-2026-002', title: 'Restyling Sito Web BarberShop Milano', status: 'DRAFT',
      subtotal: 4098.36, taxRate: 22, taxAmount: 901.64, total: 5000, discount: 0,
      validUntil: daysFromNow(15),
      notes: 'Bozza preventivo restyling sito web.',
    },
  })
  await prisma.quoteLineItem.createMany({
    data: [
      { quoteId: quote2.id, description: 'Design UX/UI (Figma)', quantity: 1, unitPrice: 1200, total: 1200, sortOrder: 1 },
      { quoteId: quote2.id, description: 'Sviluppo sito responsive', quantity: 40, unitPrice: 50, total: 2000, sortOrder: 2 },
      { quoteId: quote2.id, description: 'Integrazione booking online', quantity: 1, unitPrice: 898.36, total: 898.36, sortOrder: 3 },
    ],
  })
  console.log('  Quotes created (SENT + DRAFT)')

  // ============================================================
  // EXPENSES (5 demo, categorie miste)
  // ============================================================
  await prisma.expense.createMany({
    data: [
      { category: 'hosting', description: 'Server VPS Hostinger (mensile)', amount: 29.99, date: daysAgo(15) },
      { category: 'software', description: 'Licenza Figma Team', amount: 45, date: daysAgo(10) },
      { category: 'dominio', description: 'Rinnovo dominio techvision.it', amount: 12.50, date: daysAgo(20) },
      { category: 'marketing', description: 'Google Ads campagna lead generation', amount: 150, date: daysAgo(8) },
      { category: 'formazione', description: 'Corso React Advanced (Udemy)', amount: 14.99, date: daysAgo(12) },
    ],
    skipDuplicates: true,
  })
  console.log('  Expenses created (5)')

  // ============================================================
  // WIKI PAGES (5 demo)
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
  // TICKETS (5 demo)
  // ============================================================
  await prisma.ticket.createMany({
    data: [
      { clientId: techvision.id, projectId: projTechvision.id, creatorId: chiara.id, assigneeId: raffaele.id, number: 'TKT-001', subject: 'Bug login con Safari', description: 'Il login non funziona correttamente su Safari 18. Il token non viene salvato nel localStorage.', status: 'IN_PROGRESS', priority: 'HIGH', category: 'bug' },
      { clientId: techvision.id, projectId: projTechvision.id, creatorId: chiara.id, assigneeId: matar.id, number: 'TKT-002', subject: 'Richiesta export PDF report', description: 'Il cliente vuole poter esportare i report della dashboard in formato PDF.', status: 'OPEN', priority: 'MEDIUM', category: 'feature' },
      { clientId: barbershop.id, creatorId: chiara.id, number: 'TKT-003', subject: 'Aggiornamento orari festivi', description: 'Aggiornare gli orari di apertura per il periodo natalizio sul sito attuale.', status: 'RESOLVED', priority: 'LOW', category: 'content', resolvedAt: daysAgo(2) },
      { clientId: techvision.id, creatorId: stefano.id, assigneeId: angelo.id, number: 'TKT-004', subject: 'Performance slow su tabella ordini', description: 'La tabella ordini con 1000+ righe e molto lenta. Serve virtualizzazione o paginazione server-side.', status: 'OPEN', priority: 'HIGH', category: 'performance' },
      { clientId: sportmax.id, creatorId: chiara.id, number: 'TKT-005', subject: 'Richiesta cancellazione dati', description: 'Il cliente richiede la cancellazione di tutti i dati utente dalla piattaforma (GDPR).', status: 'WAITING_CLIENT', priority: 'URGENT', category: 'gdpr' },
    ],
    skipDuplicates: true,
  })
  console.log('  Tickets created (5)')

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  await prisma.notification.createMany({
    data: [
      { userId: emanuele.id, type: 'quote_sent', title: 'Preventivo inviato', message: 'Il preventivo PRV-2026-001 per TechVision e stato inviato.', link: '/erp/quotes' },
      { userId: stefano.id, type: 'task_completed', title: 'Task completato', message: 'Raffaele ha completato "Setup progetto Next.js + Prisma".', link: '/projects' },
      { userId: raffaele.id, type: 'ticket_assigned', title: 'Ticket assegnato', message: 'Ti e stato assegnato il ticket TKT-001: Bug login con Safari.', link: '/support' },
      { userId: matar.id, type: 'ticket_assigned', title: 'Ticket assegnato', message: 'Ti e stato assegnato il ticket TKT-002: Richiesta export PDF.', link: '/support' },
      { userId: emanuele.id, type: 'project_update', title: 'Progetto aggiornato', message: 'Il progetto "Piattaforma Gestionale TechVision" e al 40%.', link: '/projects', isRead: true },
      { userId: chiara.id, type: 'ticket_resolved', title: 'Ticket risolto', message: 'Il ticket TKT-003 e stato risolto.', link: '/support', isRead: true },
      { userId: riccardo.id, type: 'client_update', title: 'Nuovo lead', message: 'Ristorante Da Luigi aggiunto come lead.', link: '/crm' },
      { userId: angelo.id, type: 'task_assigned', title: 'Task assegnato', message: 'Ti e stato assegnato "Wireframe e mockup Figma".', link: '/projects' },
    ],
    skipDuplicates: true,
  })
  console.log('  Notifications created')

  // ============================================================
  // ACTIVITY LOGS
  // ============================================================
  await prisma.activityLog.createMany({
    data: [
      { userId: emanuele.id, action: 'create', entityType: 'project', entityId: projTechvision.id, metadata: { name: 'Piattaforma Gestionale TechVision' }, createdAt: daysAgo(45) },
      { userId: riccardo.id, action: 'create', entityType: 'client', entityId: daluigi.id, metadata: { name: 'Ristorante Da Luigi' }, createdAt: daysAgo(2) },
      { userId: emanuele.id, action: 'create', entityType: 'quote', entityId: quote1.id, metadata: { number: 'PRV-2026-001' }, createdAt: daysAgo(5) },
      { userId: raffaele.id, action: 'complete', entityType: 'task', entityId: 'seed-task', metadata: { title: 'Setup progetto Next.js + Prisma' }, createdAt: daysAgo(28) },
      { userId: stefano.id, action: 'update', entityType: 'project', entityId: projTechvision.id, metadata: { field: 'status', value: 'IN_PROGRESS' }, createdAt: daysAgo(40) },
    ],
    skipDuplicates: true,
  })
  console.log('  Activity logs created')

  console.log(`\nSeed completed!`)
  console.log(`  Default password: ${DEFAULT_PASSWORD}`)
  console.log(`  Users: ${usersData.length}, Clients: ${clientsData.length}`)
  console.log(`  Projects: 3, Tasks: 10, Quotes: 2, Expenses: 5, Wiki: 5, Tickets: 5`)

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
