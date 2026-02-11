import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_PASSWORD = 'FodiOS2026!'

async function main() {
  console.log('Seeding FODI-OS database...')

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  // Create Workspaces
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

  // Create Users
  const users = [
    { email: 'emanuele@fodisrl.it', firstName: 'Emanuele', lastName: 'Galle', role: 'ADMIN' as const },
    { email: 'riccardo@fodisrl.it', firstName: 'Riccardo', lastName: 'Tirinato', role: 'SALES' as const },
    { email: 'stefano@fodisrl.it', firstName: 'Stefano', lastName: 'Coletta', role: 'PM' as const },
    { email: 'raffaele@fodisrl.it', firstName: 'Raffaele', lastName: 'Dev', role: 'DEVELOPER' as const },
    { email: 'matar@fodisrl.it', firstName: 'Matar', lastName: 'Dev', role: 'DEVELOPER' as const },
    { email: 'angelo@fodisrl.it', firstName: 'Angelo', lastName: 'Dev', role: 'DEVELOPER' as const },
    { email: 'raffo@fodisrl.it', firstName: 'Raffo', lastName: 'Aversa', role: 'CONTENT' as const },
    { email: 'chiara@fodisrl.it', firstName: 'Chiara', lastName: 'Support', role: 'SUPPORT' as const },
  ]

  const createdUsers = []
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
      },
    })
    createdUsers.push(user)
    console.log(`  User: ${user.firstName} ${user.lastName} (${user.role})`)
  }

  // Assign Users to Workspaces
  const workspaceAssignments = [
    // Commerciale: Emanuele, Riccardo
    { workspaceId: commerciale.id, userId: createdUsers[0].id, role: 'OWNER' as const },
    { workspaceId: commerciale.id, userId: createdUsers[1].id, role: 'MEMBER' as const },
    { workspaceId: commerciale.id, userId: createdUsers[7].id, role: 'MEMBER' as const },
    // Delivery: Emanuele, Stefano, Raffaele, Matar, Angelo
    { workspaceId: delivery.id, userId: createdUsers[0].id, role: 'OWNER' as const },
    { workspaceId: delivery.id, userId: createdUsers[2].id, role: 'ADMIN' as const },
    { workspaceId: delivery.id, userId: createdUsers[3].id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: createdUsers[4].id, role: 'MEMBER' as const },
    { workspaceId: delivery.id, userId: createdUsers[5].id, role: 'MEMBER' as const },
    // Creative: Emanuele, Raffo
    { workspaceId: creative.id, userId: createdUsers[0].id, role: 'OWNER' as const },
    { workspaceId: creative.id, userId: createdUsers[6].id, role: 'MEMBER' as const },
  ]

  for (const assignment of workspaceAssignments) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: assignment.workspaceId,
          userId: assignment.userId,
        },
      },
      update: {},
      create: assignment,
    })
  }

  console.log('\nWorkspace assignments created')
  console.log(`\nSeed completed! Default password: ${DEFAULT_PASSWORD}`)

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
