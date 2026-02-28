import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_PASSWORD = 'FodiOS2026!'

async function main() {
  console.log('Seeding FODI-OS database...\n')
  console.log('NOTA: Solo struttura base (utenti, workspace, clienti, progetti).')
  console.log('Task, preventivi, spese, ticket ecc. vanno inseriti manualmente.\n')

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
  // USERS (team reale Fodi)
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

  const [emanuele, riccardo, , raffaele, matar, angelo, raffo, chiara] = users

  // Workspace Assignments
  const workspaceAssignments = [
    { workspaceId: commerciale.id, userId: users[0].id, role: 'OWNER' as const },
    { workspaceId: commerciale.id, userId: users[1].id, role: 'MEMBER' as const },
    { workspaceId: commerciale.id, userId: users[7].id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: users[0].id, role: 'OWNER' as const },
    { workspaceId: delivery.id, userId: users[2].id, role: 'ADMIN' as const },
    { workspaceId: delivery.id, userId: users[3].id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: users[4].id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: users[5].id, role: 'MEMBER' as const },
    { workspaceId: creative.id, userId: users[0].id, role: 'OWNER' as const },
    { workspaceId: creative.id, userId: users[6].id, role: 'MEMBER' as const },
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
  // CLIENTS (13 reali - solo nome, sito e info base)
  // Contatti, interazioni ecc. vanno inseriti manualmente
  // ============================================================
  const clientsData = [
    // VPS 1
    { companyName: 'Confial / FAILMS', slug: 'confial-failms', website: 'https://failms.org', industry: 'Sindacato/Formazione', source: 'Diretto', status: 'ACTIVE' as const, tags: ['formazione', 'sindacato', 'vps1'] },
    { companyName: 'Dolciaria Farina', slug: 'dolciaria-farina', website: 'https://farina.fodivps1.cloud', industry: 'Food & Beverage', source: 'Referral', status: 'ACTIVE' as const, tags: ['ecommerce', 'food', 'vps1'] },
    { companyName: 'Eccellenze Italiane TV', slug: 'eccellenze-tv', website: 'https://eccellenze-tv.fodivps1.cloud', industry: 'Media/Intrattenimento', source: 'Networking', status: 'ACTIVE' as const, tags: ['streaming', 'media', 'vps1'] },
    { companyName: 'Gruppo Cestari', slug: 'gruppo-cestari', website: 'https://gruppocestari.com', industry: 'Multiservizi', source: 'Diretto', status: 'ACTIVE' as const, tags: ['corporate', 'vps1'] },
    { companyName: 'Italafrica Centrale', slug: 'italafrica-centrale', website: 'https://italafricacentrale.com', industry: 'Relazioni Internazionali', source: 'Referral', status: 'ACTIVE' as const, tags: ['corporate', 'multilingua', 'vps1'] },
    { companyName: 'UNSIC', slug: 'unsic', website: 'https://unsic.fodivps1.cloud', industry: 'Sindacato', source: 'Diretto', status: 'ACTIVE' as const, tags: ['sindacato', 'portale', 'vps1'] },
    // VPS 2
    { companyName: 'Barber99', slug: 'barber99', website: 'https://barber99.it', industry: 'Beauty/Grooming', source: 'Google', status: 'ACTIVE' as const, tags: ['beauty', 'barbershop', 'vps2'] },
    { companyName: 'Ecolive SRL', slug: 'ecolive', website: 'https://ecolive.srl', industry: 'Edilizia/Green Building', source: 'Fiera', status: 'ACTIVE' as const, tags: ['edilizia', 'green', 'vps2'] },
    { companyName: 'General Brokers SRL', slug: 'general-brokers', website: 'https://general-brokers.fodivps2.cloud', industry: 'Assicurazioni', source: 'Networking', status: 'ACTIVE' as const, tags: ['assicurazioni', 'vps2'] },
    { companyName: 'KineLab', slug: 'kinelab', website: 'https://kinelab.fodivps2.cloud', industry: 'Salute/Fisioterapia', source: 'Passaparola', status: 'ACTIVE' as const, tags: ['salute', 'fisioterapia', 'vps2'] },
    { companyName: 'OZ Extrait', slug: 'oz-extrait', website: 'https://oz.fodivps2.cloud', industry: 'Luxury/Profumeria', source: 'Referral', status: 'ACTIVE' as const, tags: ['luxury', 'ecommerce', 'vps2'] },
    { companyName: 'Spektrum Tattoo', slug: 'spektrum-tattoo', website: 'https://spektrum-tattoo.fodivps2.cloud', industry: 'Arte/Tattoo', source: 'Instagram', status: 'ACTIVE' as const, tags: ['tattoo', 'booking', 'vps2'] },
    { companyName: 'SaaS Generali', slug: 'saas-generali', website: 'https://saas-generali.fodivps1.cloud', industry: 'Software/SaaS', source: 'Interno', status: 'PROSPECT' as const, tags: ['saas', 'interno', 'vps1'] },
  ]

  for (const cd of clientsData) {
    await prisma.client.upsert({
      where: { slug: cd.slug },
      update: {},
      create: cd,
    })
    console.log(`  Client: ${cd.companyName} (${cd.status})`)
  }

  // ============================================================
  // PROJECTS (struttura reale - NO task, milestone, time entries)
  // ============================================================
  const projectsData = [
    { workspaceSlug: 'delivery', clientSlug: 'confial-failms', name: 'FAILMS - Piattaforma Formazione', slug: 'failms-piattaforma-formazione', description: 'Piattaforma LMS per formazione sindacale.', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, color: '#DC2626' },
    { workspaceSlug: 'delivery', clientSlug: 'dolciaria-farina', name: 'Dolciaria Farina - E-commerce', slug: 'dolciaria-farina-ecommerce', description: 'E-commerce dolci artigianali.', status: 'COMPLETED' as const, priority: 'MEDIUM' as const, color: '#F59E0B' },
    { workspaceSlug: 'delivery', clientSlug: 'eccellenze-tv', name: 'Eccellenze TV - Piattaforma Streaming', slug: 'eccellenze-tv-streaming', description: 'Piattaforma streaming video Made in Italy.', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, color: '#7C3AED' },
    { workspaceSlug: 'creative', clientSlug: 'gruppo-cestari', name: 'Gruppo Cestari - Sito Corporate', slug: 'gruppo-cestari-corporate', description: 'Sito corporate gruppo aziendale.', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, color: '#0891B2' },
    { workspaceSlug: 'creative', clientSlug: 'italafrica-centrale', name: 'Italafrica - Sito Corporate', slug: 'italafrica-sito-corporate', description: 'Sito corporate multilingua.', status: 'COMPLETED' as const, priority: 'MEDIUM' as const, color: '#059669' },
    { workspaceSlug: 'delivery', clientSlug: 'unsic', name: 'UNSIC - Portale Sindacale', slug: 'unsic-portale-sindacale', description: 'Portale sindacale con area riservata.', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, color: '#2563EB' },
    { workspaceSlug: 'creative', clientSlug: 'barber99', name: 'Barber99 - Sito Web', slug: 'barber99-sito-web', description: 'Sito web barbershop con booking.', status: 'COMPLETED' as const, priority: 'MEDIUM' as const, color: '#1E293B' },
    { workspaceSlug: 'delivery', clientSlug: 'ecolive', name: 'Ecolive - Sito Web con 3D', slug: 'ecolive-sito-3d', description: 'Sito case prefabbricate con visualizzatore 3D.', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, color: '#16A34A' },
    { workspaceSlug: 'creative', clientSlug: 'general-brokers', name: 'General Brokers - Sito Vetrina', slug: 'general-brokers-sito-vetrina', description: 'Sito vetrina broker assicurativo.', status: 'PLANNING' as const, priority: 'LOW' as const, color: '#6366F1' },
    { workspaceSlug: 'delivery', clientSlug: 'kinelab', name: 'KineLab - Sito e Booking', slug: 'kinelab-sito-booking', description: 'Sito fisioterapia con prenotazione.', status: 'COMPLETED' as const, priority: 'MEDIUM' as const, color: '#0EA5E9' },
    { workspaceSlug: 'delivery', clientSlug: 'oz-extrait', name: 'OZ Extrait - E-commerce', slug: 'oz-extrait-ecommerce', description: 'E-commerce profumeria di nicchia.', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, color: '#D946EF' },
    { workspaceSlug: 'creative', clientSlug: 'spektrum-tattoo', name: 'Spektrum Tattoo - Sito e Booking', slug: 'spektrum-tattoo-sito-booking', description: 'Sito tatuaggi con portfolio e booking.', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, color: '#EC4899' },
    { workspaceSlug: 'commerciale', clientSlug: null, name: 'CRM Interno Fodi (FODI-OS)', slug: 'crm-interno-fodi', description: 'Piattaforma gestionale interna.', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, color: '#C4A052' },
  ]

  // Fetch workspace and client IDs
  const workspaces = await prisma.workspace.findMany()
  const clients = await prisma.client.findMany()
  const wsMap = Object.fromEntries(workspaces.map(w => [w.slug, w.id]))
  const clMap = Object.fromEntries(clients.map(c => [c.slug, c.id]))

  for (const pd of projectsData) {
    await prisma.project.upsert({
      where: { slug: pd.slug },
      update: {},
      create: {
        workspaceId: wsMap[pd.workspaceSlug],
        clientId: pd.clientSlug ? clMap[pd.clientSlug] : null,
        name: pd.name,
        slug: pd.slug,
        description: pd.description,
        status: pd.status,
        priority: pd.priority,
        color: pd.color,
      },
    })
    console.log(`  Project: ${pd.name} (${pd.workspaceSlug})`)
  }

  // ============================================================
  // WIKI PAGES (template procedurali - utili come base)
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
  // DIGITAL CARDS (NFC business cards)
  // ============================================================
  const digitalCardsData = [
    { userId: users[0].id, slug: 'emanuele-galle', jobTitle: 'CEO & Founder', department: 'Management', showWizards: false },
    { userId: users[1].id, slug: 'riccardo-tirinato', jobTitle: 'Sales Manager', department: 'Commerciale', showWizards: true },
    { userId: users[2].id, slug: 'stefano-coletta', jobTitle: 'Project Manager', department: 'Delivery', showWizards: false },
    { userId: users[3].id, slug: 'raffaele-dev', jobTitle: 'Full Stack Developer', department: 'Delivery', showWizards: false },
    { userId: users[4].id, slug: 'matar-dev', jobTitle: 'Full Stack Developer', department: 'Delivery', showWizards: false },
    { userId: users[5].id, slug: 'angelo-dev', jobTitle: 'Full Stack Developer', department: 'Delivery', showWizards: false },
    { userId: users[6].id, slug: 'raffo-aversa', jobTitle: 'Content Creator', department: 'Creative', showWizards: false },
    { userId: users[7].id, slug: 'chiara-support', jobTitle: 'Customer Support', department: 'Support', showWizards: false },
  ]

  for (const dc of digitalCardsData) {
    await prisma.digitalCard.upsert({
      where: { slug: dc.slug },
      update: {},
      create: dc,
    })
    console.log(`  Digital Card: ${dc.slug} (${dc.jobTitle})`)
  }
  console.log('Digital cards created\n')

  console.log('Seed completed!')
  console.log(`  Default password: ${DEFAULT_PASSWORD}`)
  console.log(`  Users: ${usersData.length}, Clients: ${clientsData.length}, Projects: ${projectsData.length}`)
  console.log('\n  Da inserire manualmente:')
  console.log('  - Contatti clienti (P.IVA, PEC, SDI, referenti)')
  console.log('  - Task e milestone')
  console.log('  - Preventivi e fatture')
  console.log('  - Spese')
  console.log('  - Ticket')
  console.log('  - Time entries')

  // ============================================================
  // AI AGENT CONFIG
  // ============================================================
  const brandSlug = process.env.BRAND_SLUG || 'fodi'
  await prisma.aiAgentConfig.upsert({
    where: { brandSlug },
    update: {},
    create: {
      brandSlug,
      name: brandSlug === 'fodi' ? 'FODI Assistant' : 'Muscari Assistant',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
      maxTokens: 4096,
      enabledTools: [],
      welcomeMessage: 'Ciao! Sono il tuo assistente AI. Posso aiutarti a gestire task, CRM, calendario e report. Come posso aiutarti?',
      isActive: true,
    },
  })
  console.log('  - AI Agent Config')

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
