/**
 * Script one-time per seedare gli IP esistenti degli utenti come trusted.
 * Evita che gli utenti vengano bloccati al primo accesso dopo il deploy.
 *
 * Eseguire con: npx tsx prisma/seed-trusted-ips.ts
 */

import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      lastIpAddress: { not: null },
    },
    select: {
      id: true,
      username: true,
      lastIpAddress: true,
    },
  })

  console.log(`Trovati ${users.length} utenti attivi con IP salvato`)

  let created = 0
  let skipped = 0

  for (const user of users) {
    if (!user.lastIpAddress) continue

    try {
      await prisma.trustedIp.upsert({
        where: {
          userId_ipAddress: {
            userId: user.id,
            ipAddress: user.lastIpAddress,
          },
        },
        update: { lastUsedAt: new Date() },
        create: {
          userId: user.id,
          ipAddress: user.lastIpAddress,
          label: 'Seed iniziale',
        },
      })
      created++
      console.log(`  + ${user.username} → ${user.lastIpAddress}`)
    } catch (err) {
      skipped++
      console.log(`  - ${user.username} → errore: ${err}`)
    }
  }

  console.log(`\nDone: ${created} IP trusted creati, ${skipped} errori`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
