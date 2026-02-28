import { query, queryOne } from './db.js'

export interface ToolResult {
  [key: string]: unknown
  content: Array<{ type: 'text'; text: string }>
}

function json(data: unknown): ToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

export const toolDefinitions = [
  {
    name: 'fodi_list_tasks',
    description: 'Lista task con filtri per stato, priorità. Restituisce titolo, stato, priorità, assegnatario, scadenza.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filtra per stato: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED' },
        priority: { type: 'string', description: 'Filtra per priorità: LOW, MEDIUM, HIGH, URGENT' },
        limit: { type: 'number', description: 'Max risultati (default: 20)' },
      },
    },
  },
  {
    name: 'fodi_create_task',
    description: 'Crea un nuovo task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Titolo del task' },
        description: { type: 'string', description: 'Descrizione' },
        priority: { type: 'string', description: 'Priorità: LOW, MEDIUM, HIGH, URGENT' },
        dueDate: { type: 'string', description: 'Scadenza ISO 8601' },
      },
      required: ['title'],
    },
  },
  {
    name: 'fodi_update_task',
    description: 'Aggiorna un task esistente.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'ID del task' },
        status: { type: 'string', description: 'Nuovo stato' },
        priority: { type: 'string', description: 'Nuova priorità' },
        title: { type: 'string', description: 'Nuovo titolo' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'fodi_list_clients',
    description: 'Lista clienti CRM con filtro per stato.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filtra: LEAD, PROSPECT, ACTIVE, INACTIVE, CHURNED' },
        search: { type: 'string', description: 'Cerca per nome azienda' },
        limit: { type: 'number', description: 'Max risultati (default: 20)' },
      },
    },
  },
  {
    name: 'fodi_list_leads',
    description: 'Lista lead nel CRM.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filtra: NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST' },
        limit: { type: 'number', description: 'Max risultati (default: 20)' },
      },
    },
  },
  {
    name: 'fodi_list_deals',
    description: 'Lista trattative nella pipeline.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        stage: { type: 'string', description: 'Fase: QUALIFICATION, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST' },
        limit: { type: 'number', description: 'Max risultati (default: 20)' },
      },
    },
  },
  {
    name: 'fodi_analytics_overview',
    description: 'Panoramica analitica: task, progetti, lead, deal.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'fodi_search_platform',
    description: 'Cerca nella piattaforma FODI OS.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Termine di ricerca' },
        scope: { type: 'string', description: 'Ambito: all, tasks, clients, leads, projects' },
      },
      required: ['query'],
    },
  },
]

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case 'fodi_list_tasks': {
      const conditions: string[] = ['"parentId" IS NULL']
      const params: unknown[] = []
      let idx = 1

      if (args.status) { conditions.push(`status = $${idx++}`); params.push(args.status) }
      if (args.priority) { conditions.push(`priority = $${idx++}`); params.push(args.priority) }

      const limit = Math.min(Number(args.limit) || 20, 50)
      const tasks = await query(
        `SELECT id, title, status, priority, "dueDate", "assigneeId"
         FROM tasks WHERE ${conditions.join(' AND ')}
         ORDER BY priority DESC, "updatedAt" DESC LIMIT $${idx}`,
        [...params, limit]
      )
      return json({ tasks, total: tasks.length })
    }

    case 'fodi_create_task': {
      const id = crypto.randomUUID()
      await query(
        `INSERT INTO tasks (id, title, description, priority, status, "dueDate", "isPersonal", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'TODO', $5, true, NOW(), NOW())`,
        [id, args.title, args.description || null, args.priority || 'MEDIUM', args.dueDate ? new Date(args.dueDate as string) : null]
      )
      return json({ id, title: args.title, status: 'TODO' })
    }

    case 'fodi_update_task': {
      const sets: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (args.status) { sets.push(`status = $${idx++}`); params.push(args.status) }
      if (args.priority) { sets.push(`priority = $${idx++}`); params.push(args.priority) }
      if (args.title) { sets.push(`title = $${idx++}`); params.push(args.title) }
      sets.push(`"updatedAt" = NOW()`)

      if (sets.length === 1) return json({ error: 'No fields to update' })

      params.push(args.taskId)
      const task = await queryOne(
        `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, title, status, priority`,
        params
      )
      return json(task || { error: 'Task not found' })
    }

    case 'fodi_list_clients': {
      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (args.status) { conditions.push(`status = $${idx++}`); params.push(args.status) }
      if (args.search) { conditions.push(`"companyName" ILIKE $${idx++}`); params.push(`%${args.search}%`) }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const limit = Math.min(Number(args.limit) || 20, 50)
      const clients = await query(
        `SELECT id, "companyName", status, industry, "totalRevenue" FROM clients ${where} ORDER BY "updatedAt" DESC LIMIT $${idx}`,
        [...params, limit]
      )
      return json({ clients, total: clients.length })
    }

    case 'fodi_list_leads': {
      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (args.status) { conditions.push(`status = $${idx++}`); params.push(args.status) }
      const limit = Math.min(Number(args.limit) || 20, 50)
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const leads = await query(
        `SELECT id, name, email, company, phone, status, source FROM leads ${where} ORDER BY "createdAt" DESC LIMIT $${idx}`,
        [...params, limit]
      )
      return json({ leads, total: leads.length })
    }

    case 'fodi_list_deals': {
      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (args.stage) { conditions.push(`stage = $${idx++}`); params.push(args.stage) }
      const limit = Math.min(Number(args.limit) || 20, 50)
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const deals = await query(
        `SELECT d.id, d.title, d.value, d.stage, d.probability, d."expectedCloseDate",
                c."companyName" as "clientName"
         FROM deals d LEFT JOIN clients c ON d."clientId" = c.id
         ${where} ORDER BY d."updatedAt" DESC LIMIT $${idx}`,
        [...params, limit]
      )
      return json({ deals, total: deals.length })
    }

    case 'fodi_analytics_overview': {
      const [tasks, projects, leads, deals] = await Promise.all([
        query(`SELECT status, COUNT(*)::int as count FROM tasks GROUP BY status`),
        query(`SELECT status, COUNT(*)::int as count FROM projects WHERE "isArchived" = false GROUP BY status`),
        query(`SELECT status, COUNT(*)::int as count FROM leads GROUP BY status`),
        query(`SELECT COUNT(*)::int as "activeDeals", COALESCE(SUM(value), 0) as "totalValue"
               FROM deals WHERE stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')`),
      ])
      return json({
        tasks: Object.fromEntries((tasks as Array<{status: string; count: number}>).map(t => [t.status, t.count])),
        projects: Object.fromEntries((projects as Array<{status: string; count: number}>).map(p => [p.status, p.count])),
        leads: Object.fromEntries((leads as Array<{status: string; count: number}>).map(l => [l.status, l.count])),
        pipeline: (deals as Array<{activeDeals: number; totalValue: string}>)[0],
      })
    }

    case 'fodi_search_platform': {
      const q = `%${(args.query as string).trim()}%`
      const scope = (args.scope as string) || 'all'
      const results: Record<string, unknown> = {}

      if (scope === 'all' || scope === 'tasks') {
        results.tasks = await query(
          `SELECT id, title, status, priority FROM tasks WHERE title ILIKE $1 LIMIT 5`, [q]
        )
      }
      if (scope === 'all' || scope === 'clients') {
        results.clients = await query(
          `SELECT id, "companyName", status FROM clients WHERE "companyName" ILIKE $1 LIMIT 5`, [q]
        )
      }
      if (scope === 'all' || scope === 'leads') {
        results.leads = await query(
          `SELECT id, name, company, status FROM leads WHERE name ILIKE $1 OR company ILIKE $1 LIMIT 5`, [q]
        )
      }
      if (scope === 'all' || scope === 'projects') {
        results.projects = await query(
          `SELECT id, name, status FROM projects WHERE name ILIKE $1 AND "isArchived" = false LIMIT 5`, [q]
        )
      }
      return json(results)
    }

    default:
      return json({ error: `Tool "${name}" not found` })
  }
}
