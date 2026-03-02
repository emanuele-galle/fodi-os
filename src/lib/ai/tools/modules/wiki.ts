import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const wikiTools: AiToolDefinition[] = [
  {
    name: 'search_wiki',
    description: 'Cerca nelle pagine wiki aziendali per titolo, contenuto, categoria o tag.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Testo da cercare nel titolo o contenuto' },
        category: { type: 'string', description: 'Filtra per categoria' },
        tag: { type: 'string', description: 'Filtra per tag' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 10)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 10, 30)
      const where: Record<string, unknown> = { isPublished: true }

      if (input.query) {
        where.OR = [
          { title: { contains: input.query as string, mode: 'insensitive' } },
          { content: { contains: input.query as string, mode: 'insensitive' } },
        ]
      }
      if (input.category) where.category = input.category
      if (input.tag) where.tags = { has: input.tag as string }

      const pages = await prisma.wikiPage.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          tags: true,
          updatedAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
      })

      return { success: true, data: { pages, total: pages.length } }
    },
  },

  {
    name: 'get_wiki_page',
    description: 'Ottieni il contenuto completo di una pagina wiki per ID o slug.',
    input_schema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'ID della pagina' },
        slug: { type: 'string', description: 'Slug della pagina (alternativa a pageId)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const page = input.pageId
        ? await prisma.wikiPage.findUnique({
            where: { id: input.pageId as string },
            include: {
              author: { select: { firstName: true, lastName: true } },
              children: { select: { id: true, title: true, slug: true }, orderBy: { sortOrder: 'asc' } },
            },
          })
        : input.slug
          ? await prisma.wikiPage.findUnique({
              where: { slug: input.slug as string },
              include: {
                author: { select: { firstName: true, lastName: true } },
                children: { select: { id: true, title: true, slug: true }, orderBy: { sortOrder: 'asc' } },
              },
            })
          : null

      if (!page) return { success: false, error: 'Pagina wiki non trovata' }
      return { success: true, data: page }
    },
  },

  {
    name: 'create_wiki_page',
    description: 'Crea una nuova pagina wiki con titolo, contenuto, categoria e tag.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titolo della pagina (obbligatorio)' },
        content: { type: 'string', description: 'Contenuto in markdown (obbligatorio)' },
        category: { type: 'string', description: 'Categoria (default: general)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tag della pagina' },
        excerpt: { type: 'string', description: 'Riassunto breve' },
        parentId: { type: 'string', description: 'ID pagina parent per gerarchia' },
        isPublished: { type: 'boolean', description: 'Pubblicata (default: true)' },
      },
      required: ['title', 'content'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const title = input.title as string
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 100)

      // Ensure unique slug
      const existing = await prisma.wikiPage.findUnique({ where: { slug } })
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug

      const page = await prisma.wikiPage.create({
        data: {
          title,
          slug: finalSlug,
          content: input.content as string,
          category: (input.category as string) || 'general',
          tags: (input.tags as string[]) || [],
          excerpt: (input.excerpt as string) || null,
          parentId: (input.parentId as string) || null,
          isPublished: input.isPublished !== false,
          authorId: context.userId,
        },
        select: { id: true, title: true, slug: true, category: true },
      })

      return { success: true, data: page }
    },
  },

  // --- update_wiki_page ---
  {
    name: 'update_wiki_page',
    description: 'Aggiorna una pagina wiki esistente',
    input_schema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'ID della pagina wiki' },
        title: { type: 'string', description: 'Nuovo titolo (opzionale)' },
        content: { type: 'string', description: 'Nuovo contenuto markdown (opzionale)' },
        excerpt: { type: 'string', description: 'Estratto (opzionale)' },
        category: { type: 'string', description: 'Categoria (opzionale)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tag (opzionale)' },
        isPublished: { type: 'boolean', description: 'Pubblicata?' },
      },
      required: ['pageId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input) => {
      const data: Record<string, unknown> = {}
      if (input.title) data.title = input.title
      if (input.content) data.content = input.content
      if (input.excerpt !== undefined) data.excerpt = input.excerpt || null
      if (input.category) data.category = input.category
      if (input.tags) data.tags = input.tags
      if (input.isPublished !== undefined) data.isPublished = input.isPublished

      const page = await prisma.wikiPage.update({
        where: { id: input.pageId as string },
        data,
        select: { id: true, title: true, slug: true, category: true, isPublished: true },
      })
      return { success: true, data: page }
    },
  },

  // --- delete_wiki_page ---
  {
    name: 'delete_wiki_page',
    description: 'Elimina una pagina wiki',
    input_schema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'ID della pagina wiki da eliminare' },
      },
      required: ['pageId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input) => {
      await prisma.wikiPage.delete({ where: { id: input.pageId as string } })
      return { success: true, data: { deleted: true } }
    },
  },
]
