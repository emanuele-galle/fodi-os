import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/ai/anthropic'
import { brand } from '@/lib/branding'

interface GenerateEmailParams {
  clientId: string
  scenario: 'followup' | 'reengagement' | 'thank_you' | 'project_update' | 'custom'
  customPrompt?: string
}

export async function generateEmail(params: GenerateEmailParams): Promise<{ subject: string; bodyHtml: string }> {
  const { clientId, scenario, customPrompt } = params

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      companyName: true,
      industry: true,
      contacts: {
        where: { isPrimary: true },
        select: { firstName: true, lastName: true, role: true },
        take: 1,
      },
    },
  })

  if (!client) throw new Error('Client not found')

  const contact = client.contacts[0]
  const contactName = contact ? `${contact.firstName} ${contact.lastName}` : 'Team'

  const scenarioPrompts: Record<string, string> = {
    followup: `Genera un'email di follow-up dopo un incontro/chiamata con il cliente. Tono professionale ma cordiale.`,
    reengagement: `Genera un'email di re-engagement per un cliente inattivo. Mostra interesse genuino e proponi un aggiornamento sulle novita.`,
    thank_you: `Genera un'email di ringraziamento per la collaborazione. Tono caloroso e apprezzativo.`,
    project_update: `Genera un'email di aggiornamento progetto. Professionale, conciso, orientato ai risultati.`,
    custom: customPrompt || 'Genera un\'email personalizzata per il cliente.',
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `${scenarioPrompts[scenario]}

Contesto:
- Brand: ${brand.name} (${brand.company})
- Cliente: ${client.companyName} (${client.industry || 'settore N/D'})
- Destinatario: ${contactName}${contact?.role ? ` (${contact.role})` : ''}

Genera un JSON con "subject" e "bodyHtml" (HTML semplice con <p> e <br>).
L'email deve essere in italiano, 3-5 paragrafi, firma "${brand.name}".
Rispondi SOLO con il JSON, senza markdown.`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  // Strip markdown code fences if present
  const text = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  try {
    const result = JSON.parse(text)
    return {
      subject: result.subject || `Email per ${client.companyName}`,
      bodyHtml: result.bodyHtml || '<p>Contenuto non generato</p>',
    }
  } catch {
    return {
      subject: `Email per ${client.companyName}`,
      bodyHtml: `<p>${text}</p>`,
    }
  }
}
