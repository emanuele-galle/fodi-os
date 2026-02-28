import { query } from './db.js'

export const resourceDefinitions = [
  {
    uri: 'fodi://projects',
    name: 'Lista Progetti',
    description: 'Tutti i progetti attivi in FODI OS',
    mimeType: 'application/json',
  },
  {
    uri: 'fodi://clients',
    name: 'Lista Clienti',
    description: 'Tutti i clienti nel CRM',
    mimeType: 'application/json',
  },
  {
    uri: 'fodi://dashboard',
    name: 'Dashboard Overview',
    description: 'Panoramica dashboard con statistiche principali',
    mimeType: 'application/json',
  },
]

export async function readResource(uri: string): Promise<string> {
  switch (uri) {
    case 'fodi://projects': {
      const projects = await query(
        `SELECT id, name, status, "startDate", "endDate",
                (SELECT COUNT(*)::int FROM tasks WHERE "projectId" = p.id) as "taskCount"
         FROM projects p WHERE "isArchived" = false ORDER BY "updatedAt" DESC`
      )
      return JSON.stringify({ projects, total: projects.length }, null, 2)
    }

    case 'fodi://clients': {
      const clients = await query(
        `SELECT id, "companyName", status, industry, "totalRevenue",
                (SELECT COUNT(*)::int FROM contacts WHERE "clientId" = c.id) as "contactCount",
                (SELECT COUNT(*)::int FROM deals WHERE "clientId" = c.id) as "dealCount"
         FROM clients c ORDER BY "updatedAt" DESC LIMIT 100`
      )
      return JSON.stringify({ clients, total: clients.length }, null, 2)
    }

    case 'fodi://dashboard': {
      const [tasks, projects, leads, deals] = await Promise.all([
        query(`SELECT status, COUNT(*)::int as count FROM tasks WHERE "parentId" IS NULL GROUP BY status`),
        query(`SELECT status, COUNT(*)::int as count FROM projects WHERE "isArchived" = false GROUP BY status`),
        query(`SELECT status, COUNT(*)::int as count FROM leads GROUP BY status`),
        query(`SELECT COUNT(*)::int as total, COALESCE(SUM(value), 0)::text as value
               FROM deals WHERE stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')`),
      ])
      return JSON.stringify({
        tasks: Object.fromEntries((tasks as Array<{status: string; count: number}>).map(t => [t.status, t.count])),
        projects: Object.fromEntries((projects as Array<{status: string; count: number}>).map(p => [p.status, p.count])),
        leads: Object.fromEntries((leads as Array<{status: string; count: number}>).map(l => [l.status, l.count])),
        pipeline: (deals as Array<{total: number; value: string}>)[0],
      }, null, 2)
    }

    default:
      throw new Error(`Resource "${uri}" not found`)
  }
}
