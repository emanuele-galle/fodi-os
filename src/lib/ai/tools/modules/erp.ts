import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const erpTools: AiToolDefinition[] = [
  {
    name: 'get_financial_summary',
    description: 'Riepilogo finanziario del mese corrente: entrate, uscite, margine. Confronto con il mese precedente e trend.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async () => {
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

      const [currentIncome, currentExpenses, prevIncome, prevExpenses] = await Promise.all([
        prisma.income.aggregate({ where: { date: { gte: currentMonthStart, lte: currentMonthEnd } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { date: { gte: currentMonthStart, lte: currentMonthEnd } }, _sum: { amount: true } }),
        prisma.income.aggregate({ where: { date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
      ])

      const curInc = currentIncome._sum.amount?.toString() || '0'
      const curExp = currentExpenses._sum.amount?.toString() || '0'
      const curMargin = (Number(curInc) - Number(curExp)).toFixed(2)
      const prevInc = prevIncome._sum.amount?.toString() || '0'
      const prevExp = prevExpenses._sum.amount?.toString() || '0'
      const prevMargin = (Number(prevInc) - Number(prevExp)).toFixed(2)

      const trend = Number(curMargin) > Number(prevMargin) ? 'up' : Number(curMargin) < Number(prevMargin) ? 'down' : 'stable'

      return {
        success: true,
        data: {
          currentMonth: { income: curInc, expenses: curExp, margin: curMargin },
          previousMonth: { income: prevInc, expenses: prevExp, margin: prevMargin },
          trend,
        },
      }
    },
  },

  {
    name: 'list_quotes',
    description: 'Lista i preventivi con filtro per stato. Mostra cliente, numero righe, totale.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtra per stato: DRAFT, SENT, APPROVED, REJECTED, EXPIRED, INVOICED' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}
      if (input.status) where.status = input.status

      const quotes = await prisma.quote.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          total: true,
          createdAt: true,
          validUntil: true,
          client: { select: { id: true, companyName: true } },
          _count: { select: { lineItems: true } },
        },
      })

      const formatted = quotes.map(q => ({ ...q, total: q.total.toString() }))

      return { success: true, data: { quotes: formatted, total: formatted.length } }
    },
  },

  {
    name: 'get_quote_details',
    description: 'Dettaglio completo di un preventivo: cliente, righe, importi, stato, creatore.',
    input_schema: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'ID del preventivo (obbligatorio)' },
      },
      required: ['quoteId'],
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const quote = await prisma.quote.findUnique({
        where: { id: input.quoteId as string },
        include: {
          client: { select: { id: true, companyName: true, status: true } },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      if (!quote) return { success: false, error: 'Preventivo non trovato' }

      return {
        success: true,
        data: {
          ...quote,
          subtotal: quote.subtotal.toString(),
          taxRate: quote.taxRate.toString(),
          taxAmount: quote.taxAmount.toString(),
          total: quote.total.toString(),
          discount: quote.discount.toString(),
          lineItems: quote.lineItems.map(li => ({
            ...li,
            unitPrice: li.unitPrice.toString(),
            total: li.total.toString(),
          })),
        },
      }
    },
  },

  {
    name: 'list_expenses',
    description: 'Lista le spese con filtro per categoria e intervallo di date.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filtra per categoria' },
        startDate: { type: 'string', description: 'Data inizio filtro (ISO 8601)' },
        endDate: { type: 'string', description: 'Data fine filtro (ISO 8601)' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}
      if (input.category) where.category = input.category
      if (input.startDate || input.endDate) {
        const dateFilter: Record<string, Date> = {}
        if (input.startDate) dateFilter.gte = new Date(input.startDate as string)
        if (input.endDate) dateFilter.lte = new Date(input.endDate as string)
        where.date = dateFilter
      }

      const expenses = await prisma.expense.findMany({
        where,
        take: limit,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          category: true,
          description: true,
          amount: true,
          date: true,
          isPaid: true,
          supplierName: true,
          invoiceNumber: true,
          client: { select: { id: true, companyName: true } },
          project: { select: { id: true, name: true } },
        },
      })

      const formatted = expenses.map(e => ({ ...e, amount: e.amount.toString() }))

      return { success: true, data: { expenses: formatted, total: formatted.length } }
    },
  },

  {
    name: 'list_income',
    description: 'Lista le entrate con filtro per date e stato pagamento.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inizio filtro (ISO 8601)' },
        endDate: { type: 'string', description: 'Data fine filtro (ISO 8601)' },
        isPaid: { type: 'boolean', description: 'Filtra per stato pagamento (true/false)' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}
      if (input.isPaid !== undefined) where.isPaid = input.isPaid
      if (input.startDate || input.endDate) {
        const dateFilter: Record<string, Date> = {}
        if (input.startDate) dateFilter.gte = new Date(input.startDate as string)
        if (input.endDate) dateFilter.lte = new Date(input.endDate as string)
        where.date = dateFilter
      }

      const income = await prisma.income.findMany({
        where,
        take: limit,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          clientName: true,
          category: true,
          amount: true,
          date: true,
          isPaid: true,
          invoiceNumber: true,
          dueDate: true,
          notes: true,
          client: { select: { id: true, companyName: true } },
        },
      })

      const formatted = income.map(i => ({ ...i, amount: i.amount.toString() }))

      return { success: true, data: { income: formatted, total: formatted.length } }
    },
  },

  {
    name: 'get_monthly_report',
    description: 'Report mensile: entrate, uscite e margine per un mese specifico. Confronto con mese precedente.',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Mese (1-12, default: mese corrente)' },
        year: { type: 'number', description: 'Anno (default: anno corrente)' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const now = new Date()
      const month = Number(input.month) || (now.getMonth() + 1)
      const year = Number(input.year) || now.getFullYear()

      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59)
      const prevMonthStart = new Date(year, month - 2, 1)
      const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59)

      const [incomeAgg, expenseAgg, prevIncomeAgg, prevExpenseAgg] = await Promise.all([
        prisma.income.aggregate({ where: { date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
        prisma.income.aggregate({ where: { date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
      ])

      const income = incomeAgg._sum.amount?.toString() || '0'
      const expenses = expenseAgg._sum.amount?.toString() || '0'
      const margin = (Number(income) - Number(expenses)).toFixed(2)
      const prevIncome = prevIncomeAgg._sum.amount?.toString() || '0'
      const prevExpenses = prevExpenseAgg._sum.amount?.toString() || '0'
      const prevMargin = (Number(prevIncome) - Number(prevExpenses)).toFixed(2)

      return {
        success: true,
        data: {
          period: { month, year },
          current: { income, expenses, margin },
          previous: { income: prevIncome, expenses: prevExpenses, margin: prevMargin },
          trend: Number(margin) > Number(prevMargin) ? 'up' : Number(margin) < Number(prevMargin) ? 'down' : 'stable',
        },
      }
    },
  },

  {
    name: 'list_recurring_invoices',
    description: 'Lista le fatture ricorrenti attive, ordinate per prossima scadenza.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async () => {
      const invoices = await prisma.recurringInvoice.findMany({
        where: { isActive: true },
        orderBy: { nextDueDate: 'asc' },
      })

      const formatted = invoices.map(i => ({ ...i, amount: i.amount.toString() }))

      return { success: true, data: { invoices: formatted, total: formatted.length } }
    },
  },

  {
    name: 'list_invoice_monitoring',
    description: 'Monitoraggio fatture: entrate e spese non pagate, con scadenze imminenti (entro 30 giorni) o scadute.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async () => {
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const [unpaidIncome, unpaidExpenses] = await Promise.all([
        prisma.income.findMany({
          where: { isPaid: false },
          orderBy: { dueDate: 'asc' },
          select: {
            id: true,
            clientName: true,
            amount: true,
            date: true,
            dueDate: true,
            invoiceNumber: true,
            category: true,
          },
        }),
        prisma.expense.findMany({
          where: { isPaid: false },
          orderBy: { dueDate: 'asc' },
          select: {
            id: true,
            description: true,
            amount: true,
            date: true,
            dueDate: true,
            supplierName: true,
            invoiceNumber: true,
            category: true,
          },
        }),
      ])

      const classifyItem = (item: { dueDate: Date | null }) => {
        if (!item.dueDate) return 'no_due_date'
        if (item.dueDate < now) return 'overdue'
        if (item.dueDate <= thirtyDaysFromNow) return 'approaching'
        return 'future'
      }

      const formattedIncome = unpaidIncome.map(i => ({
        ...i,
        amount: i.amount.toString(),
        urgency: classifyItem(i),
      }))

      const formattedExpenses = unpaidExpenses.map(e => ({
        ...e,
        amount: e.amount.toString(),
        urgency: classifyItem(e),
      }))

      return {
        success: true,
        data: {
          unpaidIncome: formattedIncome,
          unpaidExpenses: formattedExpenses,
          summary: {
            totalUnpaidIncome: formattedIncome.length,
            totalUnpaidExpenses: formattedExpenses.length,
            overdueIncome: formattedIncome.filter(i => i.urgency === 'overdue').length,
            overdueExpenses: formattedExpenses.filter(e => e.urgency === 'overdue').length,
          },
        },
      }
    },
  },

  {
    name: 'create_quote',
    description: 'Crea un nuovo preventivo con righe dettagliate. Calcola automaticamente totali, IVA 22% e numero progressivo.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
        title: { type: 'string', description: 'Titolo del preventivo (obbligatorio)' },
        items: {
          type: 'array',
          description: 'Righe del preventivo (obbligatorio)',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Descrizione riga' },
              quantity: { type: 'number', description: 'Quantità' },
              unitPrice: { type: 'number', description: 'Prezzo unitario' },
            },
          },
        },
        notes: { type: 'string', description: 'Note aggiuntive' },
        validUntil: { type: 'string', description: 'Data scadenza preventivo (ISO 8601)' },
      },
      required: ['clientId', 'title', 'items'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const items = input.items as Array<{ description: string; quantity: number; unitPrice: number }>
      if (!items || items.length === 0) return { success: false, error: 'Almeno una riga è obbligatoria' }

      const year = new Date().getFullYear()
      const count = await prisma.quote.count({
        where: {
          number: { startsWith: `QT-${year}-` },
        },
      })
      const number = `QT-${year}-${String(count + 1).padStart(3, '0')}`

      const lineItems = items.map((item, idx) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        total: (item.quantity || 1) * item.unitPrice,
        sortOrder: idx,
      }))

      const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0)
      const taxAmount = subtotal * 0.22
      const total = subtotal + taxAmount

      const quote = await prisma.$transaction(async (tx) => {
        const created = await tx.quote.create({
          data: {
            clientId: input.clientId as string,
            creatorId: context.userId,
            number,
            title: input.title as string,
            subtotal,
            taxRate: 22,
            taxAmount,
            total,
            discount: 0,
            notes: (input.notes as string) || null,
            validUntil: input.validUntil ? new Date(input.validUntil as string) : null,
            lineItems: {
              create: lineItems,
            },
          },
          include: {
            lineItems: true,
            client: { select: { id: true, companyName: true } },
          },
        })
        return created
      })

      return {
        success: true,
        data: {
          id: quote.id,
          number: quote.number,
          title: quote.title,
          client: quote.client,
          subtotal: quote.subtotal.toString(),
          taxAmount: quote.taxAmount.toString(),
          total: quote.total.toString(),
          itemsCount: quote.lineItems.length,
        },
      }
    },
  },

  {
    name: 'update_quote_status',
    description: 'Aggiorna lo stato di un preventivo. Registra automaticamente le date di invio, approvazione o rifiuto.',
    input_schema: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'ID del preventivo (obbligatorio)' },
        status: { type: 'string', description: 'Nuovo stato: DRAFT, SENT, APPROVED, REJECTED, EXPIRED, INVOICED (obbligatorio)' },
      },
      required: ['quoteId', 'status'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = { status: input.status }
      const now = new Date()

      if (input.status === 'SENT') data.sentAt = now
      if (input.status === 'APPROVED') data.approvedAt = now
      if (input.status === 'REJECTED') data.rejectedAt = now

      const quote = await prisma.quote.update({
        where: { id: input.quoteId as string },
        data,
        select: { id: true, number: true, title: true, status: true },
      })

      return { success: true, data: quote }
    },
  },

  {
    name: 'create_expense',
    description: 'Registra una nuova spesa con categoria, importo e data. Opzionalmente collegata a cliente o progetto.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Categoria della spesa (obbligatorio)' },
        description: { type: 'string', description: 'Descrizione della spesa (obbligatorio)' },
        amount: { type: 'number', description: 'Importo in euro (obbligatorio)' },
        date: { type: 'string', description: 'Data della spesa ISO 8601 (obbligatorio)' },
        clientId: { type: 'string', description: 'ID del cliente (opzionale)' },
        projectId: { type: 'string', description: 'ID del progetto (opzionale)' },
      },
      required: ['category', 'description', 'amount', 'date'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const expense = await prisma.expense.create({
        data: {
          category: input.category as string,
          description: input.description as string,
          amount: input.amount as number,
          date: new Date(input.date as string),
          clientId: (input.clientId as string) || null,
          projectId: (input.projectId as string) || null,
        },
      })

      return {
        success: true,
        data: {
          id: expense.id,
          category: expense.category,
          description: expense.description,
          amount: expense.amount.toString(),
          date: expense.date,
        },
      }
    },
  },

  {
    name: 'create_income',
    description: 'Registra una nuova entrata con cliente, categoria, importo e data.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Nome del cliente (obbligatorio)' },
        category: { type: 'string', description: 'Categoria dell\'entrata (obbligatorio)' },
        amount: { type: 'number', description: 'Importo in euro (obbligatorio)' },
        date: { type: 'string', description: 'Data dell\'entrata ISO 8601 (obbligatorio)' },
        invoiceNumber: { type: 'string', description: 'Numero fattura (opzionale)' },
        clientId: { type: 'string', description: 'ID del cliente nel CRM (opzionale)' },
        notes: { type: 'string', description: 'Note aggiuntive (opzionale)' },
      },
      required: ['clientName', 'category', 'amount', 'date'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const income = await prisma.income.create({
        data: {
          clientName: input.clientName as string,
          category: input.category as string,
          amount: input.amount as number,
          date: new Date(input.date as string),
          invoiceNumber: (input.invoiceNumber as string) || null,
          clientId: (input.clientId as string) || null,
          notes: (input.notes as string) || null,
        },
      })

      return {
        success: true,
        data: {
          id: income.id,
          clientName: income.clientName,
          category: income.category,
          amount: income.amount.toString(),
          date: income.date,
        },
      }
    },
  },
]
