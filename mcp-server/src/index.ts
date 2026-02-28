import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { executeTool } from './tools.js'
import { resourceDefinitions, readResource } from './resources.js'

const server = new McpServer({
  name: 'fodi-os',
  version: '1.0.0',
})

// --- Tools ---

server.tool('fodi_list_tasks', 'Lista task con filtri per stato, priorità.',
  { status: z.string().optional(), priority: z.string().optional(), limit: z.number().optional() },
  async (args) => executeTool('fodi_list_tasks', args)
)

server.tool('fodi_create_task', 'Crea un nuovo task.',
  { title: z.string(), description: z.string().optional(), priority: z.string().optional(), dueDate: z.string().optional() },
  async (args) => executeTool('fodi_create_task', args)
)

server.tool('fodi_update_task', 'Aggiorna un task esistente.',
  { taskId: z.string(), status: z.string().optional(), priority: z.string().optional(), title: z.string().optional() },
  async (args) => executeTool('fodi_update_task', args)
)

server.tool('fodi_list_clients', 'Lista clienti CRM con filtro per stato.',
  { status: z.string().optional(), search: z.string().optional(), limit: z.number().optional() },
  async (args) => executeTool('fodi_list_clients', args)
)

server.tool('fodi_list_leads', 'Lista lead nel CRM.',
  { status: z.string().optional(), limit: z.number().optional() },
  async (args) => executeTool('fodi_list_leads', args)
)

server.tool('fodi_list_deals', 'Lista trattative nella pipeline.',
  { stage: z.string().optional(), limit: z.number().optional() },
  async (args) => executeTool('fodi_list_deals', args)
)

server.tool('fodi_analytics_overview', 'Panoramica analitica: task, progetti, lead, deal.',
  {},
  async (args) => executeTool('fodi_analytics_overview', args)
)

server.tool('fodi_search_platform', 'Cerca nella piattaforma FODI OS.',
  { query: z.string(), scope: z.string().optional() },
  async (args) => executeTool('fodi_search_platform', args)
)

// --- Resources ---

for (const resource of resourceDefinitions) {
  server.resource(
    resource.name,
    resource.uri,
    { description: resource.description, mimeType: resource.mimeType },
    async () => {
      const content = await readResource(resource.uri)
      return {
        contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: content }],
      }
    }
  )
}

// Start
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('FODI OS MCP Server started (stdio)')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
