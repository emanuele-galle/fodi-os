import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

function jsonRpcResponse(id: string | number | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function jsonRpcError(id: string | number | undefined, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}

const TOOLS = [
  {
    name: 'save_sales_lead',
    description: 'Salva i dati di un potenziale cliente interessato ai servizi FODI. Usa quando un prospect fornisce nome ed email.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Nome completo del potenziale cliente' },
        email: { type: 'string', description: 'Indirizzo email' },
        phone: { type: 'string', description: 'Numero di telefono (opzionale)' },
        company: { type: 'string', description: 'Nome azienda (opzionale)' },
        message: { type: 'string', description: 'Note o servizio richiesto (opzionale)' },
      },
      required: ['name', 'email'],
    },
  },
  {
    name: 'check_client',
    description: 'Verifica se un contatto esiste nel CRM di FODI cercando per email. Usa quando un cliente si identifica.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        email: { type: 'string', description: 'Email del cliente da cercare' },
      },
      required: ['email'],
    },
  },
  {
    name: 'get_project_status',
    description: 'Verifica lo stato di avanzamento di un progetto FODI. Usa quando un cliente chiede info sul proprio progetto.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_name: { type: 'string', description: 'Nome o slug del progetto' },
      },
      required: ['project_name'],
    },
  },
]

async function handleToolCall(name: string, args: Record<string, string>) {
  switch (name) {
    case 'save_sales_lead': {
      const { name: leadName, email, phone, company, message } = args
      if (!leadName || !email) {
        return { content: [{ type: 'text', text: 'Mi servono almeno nome e email per salvare il contatto.' }] }
      }
      const lead = await prisma.lead.create({
        data: {
          name: leadName,
          email,
          company: company || null,
          phone: phone || null,
          message: message || 'Contatto da assistente vocale Giusy',
          source: 'voice-agent',
        },
      })
      return {
        content: [{ type: 'text', text: `Perfetto! Ho salvato il contatto di ${lead.name}. Un membro del team ti ricontatterà presto.` }],
      }
    }

    case 'check_client': {
      const { email } = args
      if (!email) {
        return { content: [{ type: 'text', text: 'Mi serve un indirizzo email per cercare il cliente.' }] }
      }
      const lead = await prisma.lead.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
      })
      if (lead) {
        return {
          content: [{ type: 'text', text: `Ho trovato ${lead.name} (${lead.email}), stato: ${lead.status}. Registrato il ${new Date(lead.createdAt).toLocaleDateString('it-IT')}.` }],
        }
      }
      return {
        content: [{ type: 'text', text: 'Non ho trovato nessun contatto con questa email. Vuoi lasciare i tuoi dati?' }],
      }
    }

    case 'get_project_status': {
      const { project_name } = args
      if (!project_name) {
        return { content: [{ type: 'text', text: 'Mi serve il nome del progetto per verificarne lo stato.' }] }
      }
      const project = await prisma.project.findFirst({
        where: {
          OR: [
            { name: { contains: project_name, mode: 'insensitive' } },
            { slug: { contains: project_name, mode: 'insensitive' } },
          ],
        },
        select: { name: true, status: true, updatedAt: true },
      })
      if (project) {
        return {
          content: [{ type: 'text', text: `Il progetto "${project.name}" è in stato "${project.status}". Ultimo aggiornamento: ${new Date(project.updatedAt).toLocaleDateString('it-IT')}.` }],
        }
      }
      return {
        content: [{ type: 'text', text: `Non ho trovato un progetto chiamato "${project_name}". Posso aiutarti con qualcos'altro?` }],
      }
    }

    default:
      return { content: [{ type: 'text', text: `Tool "${name}" non riconosciuto.` }], isError: true }
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  if (WEBHOOK_SECRET) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
      || request.headers.get('x-webhook-secret')
    if (token !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await request.json() as JsonRpcRequest
    const { method, id, params } = body

    switch (method) {
      case 'initialize':
        return jsonRpcResponse(id, {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'fodi-os-voice-tools', version: '1.0.0' },
        })

      case 'notifications/initialized':
        return jsonRpcResponse(id, {})

      case 'tools/list':
        return jsonRpcResponse(id, { tools: TOOLS })

      case 'tools/call': {
        const toolName = (params as { name: string }).name
        const toolArgs = (params as { arguments: Record<string, string> }).arguments || {}
        const result = await handleToolCall(toolName, toolArgs)
        return jsonRpcResponse(id, result)
      }

      default:
        return jsonRpcError(id, -32601, `Method not found: ${method}`)
    }
  } catch (err) {
    console.error('[voice-agent/mcp]', err)
    return jsonRpcError(undefined, -32603, 'Internal error')
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'fodi-os-voice-tools',
    version: '1.0.0',
    description: 'MCP server per gli strumenti dell\'assistente vocale FODI OS',
  })
}
