import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

const INVALID_DATE_ERROR = { success: false, error: 'Data non valida' } as const

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

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
        if (input.startDate) {
          const d = parseDate(input.startDate)
          if (!d) return { success: false, error: 'Data inizio non valida' }
          dateFilter.gte = d
        }
        if (input.endDate) {
          const d = parseDate(input.endDate)
          if (!d) return { success: false, error: 'Data fine non valida' }
          dateFilter.lte = d
        }
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
        if (input.startDate) {
          const d = parseDate(input.startDate)
          if (!d) return { success: false, error: 'Data inizio non valida' }
          dateFilter.gte = d
        }
        if (input.endDate) {
          const d = parseDate(input.endDate)
          if (!d) return { success: false, error: 'Data fine non valida' }
          dateFilter.lte = d
        }
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

      const parsedValidUntil = input.validUntil ? parseDate(input.validUntil) : null
      if (input.validUntil && !parsedValidUntil) return INVALID_DATE_ERROR

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

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const quote = await prisma.$transaction(async (tx) => {
            const year = new Date().getFullYear()
            const count = await tx.quote.count({
              where: { number: { startsWith: `QT-${year}-` } },
            })
            const number = `QT-${year}-${String(count + 1).padStart(3, '0')}`

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
                validUntil: parsedValidUntil,
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
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 2) continue
          throw e
        }
      }
      return { success: false, error: 'Impossibile generare numero preventivo univoco' }
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
      const parsedDate = parseDate(input.date)
      if (!parsedDate) return INVALID_DATE_ERROR

      const expense = await prisma.expense.create({
        data: {
          category: input.category as string,
          description: input.description as string,
          amount: input.amount as number,
          date: parsedDate,
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
      const parsedDate = parseDate(input.date)
      if (!parsedDate) return INVALID_DATE_ERROR

      const income = await prisma.income.create({
        data: {
          clientName: input.clientName as string,
          category: input.category as string,
          amount: input.amount as number,
          date: parsedDate,
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

  {
    name: 'create_recurring_invoice',
    description: 'Crea una fattura/spesa ricorrente (es. abbonamento, affitto, utenza).',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Descrizione della ricorrenza (obbligatorio)' },
        category: { type: 'string', description: 'Categoria (obbligatorio)' },
        supplierName: { type: 'string', description: 'Nome fornitore' },
        amount: { type: 'number', description: 'Importo in euro (obbligatorio)' },
        frequency: { type: 'string', description: 'Frequenza: monthly, quarterly, yearly (obbligatorio)' },
        firstDate: { type: 'string', description: 'Data primo pagamento ISO 8601 (obbligatorio)' },
        bankAccountId: { type: 'string', description: 'ID conto bancario associato' },
        notes: { type: 'string', description: 'Note aggiuntive' },
      },
      required: ['description', 'category', 'amount', 'frequency', 'firstDate'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const parsedFirstDate = parseDate(input.firstDate)
      if (!parsedFirstDate) return INVALID_DATE_ERROR

      const invoice = await prisma.recurringInvoice.create({
        data: {
          description: input.description as string,
          category: input.category as string,
          supplierName: (input.supplierName as string) || null,
          amount: input.amount as number,
          frequency: input.frequency as string,
          firstDate: parsedFirstDate,
          nextDueDate: parsedFirstDate,
          bankAccountId: (input.bankAccountId as string) || null,
          notes: (input.notes as string) || null,
        },
        select: { id: true, description: true, amount: true, frequency: true, nextDueDate: true },
      })

      return { success: true, data: { ...invoice, amount: invoice.amount.toString() } }
    },
  },

  {
    name: 'update_recurring_invoice',
    description: 'Aggiorna una fattura ricorrente (importo, frequenza, stato attivo, note).',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'ID della fattura ricorrente (obbligatorio)' },
        amount: { type: 'number', description: 'Nuovo importo' },
        frequency: { type: 'string', description: 'Nuova frequenza: monthly, quarterly, yearly' },
        isActive: { type: 'boolean', description: 'Attiva/disattiva la ricorrenza' },
        notes: { type: 'string', description: 'Nuove note' },
        supplierName: { type: 'string', description: 'Nuovo nome fornitore' },
      },
      required: ['invoiceId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = {}
      if (input.amount !== undefined) data.amount = input.amount
      if (input.frequency) data.frequency = input.frequency
      if (input.isActive !== undefined) data.isActive = input.isActive
      if (input.notes !== undefined) data.notes = input.notes
      if (input.supplierName !== undefined) data.supplierName = input.supplierName

      const invoice = await prisma.recurringInvoice.update({
        where: { id: input.invoiceId as string },
        data,
        select: { id: true, description: true, amount: true, frequency: true, isActive: true },
      })

      return { success: true, data: { ...invoice, amount: invoice.amount.toString() } }
    },
  },

  {
    name: 'list_bank_accounts',
    description: 'Lista i conti bancari con saldo e stato.',
    input_schema: {
      type: 'object',
      properties: {
        activeOnly: { type: 'boolean', description: 'Se true, mostra solo conti attivi (default: true)' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const accounts = await prisma.bankAccount.findMany({
        where: input.activeOnly !== false ? { isActive: true } : {},
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          type: true,
          balance: true,
          isActive: true,
          _count: { select: { incomes: true, expenses: true } },
        },
      })

      return {
        success: true,
        data: {
          accounts: accounts.map((a) => ({ ...a, balance: a.balance.toString() })),
          total: accounts.length,
        },
      }
    },
  },

  {
    name: 'create_bank_transfer',
    description: 'Registra un trasferimento tra conti bancari (giroconto).',
    input_schema: {
      type: 'object',
      properties: {
        fromAccountId: { type: 'string', description: 'ID conto di origine (obbligatorio)' },
        toAccountId: { type: 'string', description: 'ID conto di destinazione (obbligatorio)' },
        amount: { type: 'number', description: 'Importo in euro (obbligatorio)' },
        operation: { type: 'string', description: 'Descrizione operazione (obbligatorio)' },
        date: { type: 'string', description: 'Data operazione ISO 8601 (default: oggi)' },
        notes: { type: 'string', description: 'Note aggiuntive' },
      },
      required: ['fromAccountId', 'toAccountId', 'amount', 'operation'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      if (input.fromAccountId === input.toAccountId) {
        return { success: false, error: 'Il conto di origine e destinazione devono essere diversi' }
      }

      const transfer = await prisma.bankTransfer.create({
        data: {
          fromAccountId: input.fromAccountId as string,
          toAccountId: input.toAccountId as string,
          amount: input.amount as number,
          operation: input.operation as string,
          date: input.date ? (parseDate(input.date) ?? new Date()) : new Date(),
          notes: (input.notes as string) || null,
        },
        include: {
          fromAccount: { select: { name: true } },
          toAccount: { select: { name: true } },
        },
      })

      return {
        success: true,
        data: {
          id: transfer.id,
          from: transfer.fromAccount.name,
          to: transfer.toAccount.name,
          amount: transfer.amount.toString(),
          date: transfer.date,
        },
      }
    },
  },

  {
    name: 'list_accounting_categories',
    description: 'Lista le categorie contabili (entrate e uscite).',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filtra per tipo: income o expense' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const where: Record<string, unknown> = { isActive: true }
      if (input.type) where.type = input.type

      const categories = await prisma.accountingCategory.findMany({
        where,
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
        select: { id: true, name: true, type: true, icon: true },
      })

      return { success: true, data: { categories, total: categories.length } }
    },
  },

  {
    name: 'list_vat_rates',
    description: 'Lista le aliquote IVA disponibili.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async () => {
      const rates = await prisma.vatRate.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, rate: true, label: true, code: true, description: true, isDefault: true },
      })

      return {
        success: true,
        data: { rates: rates.map((r) => ({ ...r, rate: r.rate.toString() })), total: rates.length },
      }
    },
  },

  // --- update_expense ---
  {
    name: 'update_expense',
    description: 'Aggiorna una spesa esistente',
    input_schema: {
      type: 'object',
      properties: {
        expenseId: { type: 'string', description: 'ID della spesa' },
        category: { type: 'string' },
        description: { type: 'string' },
        amount: { type: 'number' },
        date: { type: 'string', description: 'Data ISO' },
        isPaid: { type: 'boolean' },
        supplierName: { type: 'string' },
        notes: { type: 'string' },
        invoiceNumber: { type: 'string' },
      },
      required: ['expenseId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input) => {
      const data: Record<string, unknown> = {}
      if (input.category) data.category = input.category
      if (input.description) data.description = input.description
      if (input.amount !== undefined) data.amount = input.amount
      if (input.date) {
        const parsedDate = parseDate(input.date)
        if (!parsedDate) return INVALID_DATE_ERROR
        data.date = parsedDate
      }
      if (input.isPaid !== undefined) data.isPaid = input.isPaid
      if (input.supplierName !== undefined) data.supplierName = input.supplierName || null
      if (input.notes !== undefined) data.notes = input.notes || null
      if (input.invoiceNumber !== undefined) data.invoiceNumber = input.invoiceNumber || null

      const expense = await prisma.expense.update({
        where: { id: input.expenseId as string },
        data,
        select: { id: true, category: true, description: true, amount: true, date: true, isPaid: true },
      })
      return { success: true, data: { ...expense, amount: expense.amount.toString() } }
    },
  },

  // --- update_income ---
  {
    name: 'update_income',
    description: 'Aggiorna un\'entrata esistente',
    input_schema: {
      type: 'object',
      properties: {
        incomeId: { type: 'string', description: 'ID dell\'entrata' },
        clientName: { type: 'string' },
        category: { type: 'string' },
        amount: { type: 'number' },
        date: { type: 'string', description: 'Data ISO' },
        isPaid: { type: 'boolean' },
        invoiceNumber: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['incomeId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input) => {
      const data: Record<string, unknown> = {}
      if (input.clientName) data.clientName = input.clientName
      if (input.category) data.category = input.category
      if (input.amount !== undefined) data.amount = input.amount
      if (input.date) {
        const parsedDate = parseDate(input.date)
        if (!parsedDate) return INVALID_DATE_ERROR
        data.date = parsedDate
      }
      if (input.isPaid !== undefined) data.isPaid = input.isPaid
      if (input.invoiceNumber !== undefined) data.invoiceNumber = input.invoiceNumber || null
      if (input.notes !== undefined) data.notes = input.notes || null

      const income = await prisma.income.update({
        where: { id: input.incomeId as string },
        data,
        select: { id: true, clientName: true, category: true, amount: true, date: true, isPaid: true },
      })
      return { success: true, data: { ...income, amount: income.amount.toString() } }
    },
  },

  // --- delete_expense ---
  {
    name: 'delete_expense',
    description: 'Elimina una spesa',
    input_schema: {
      type: 'object',
      properties: {
        expenseId: { type: 'string', description: 'ID della spesa da eliminare' },
      },
      required: ['expenseId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input) => {
      await prisma.expense.delete({ where: { id: input.expenseId as string } })
      return { success: true, data: { deleted: true } }
    },
  },

  // --- delete_income ---
  {
    name: 'delete_income',
    description: 'Elimina un\'entrata',
    input_schema: {
      type: 'object',
      properties: {
        incomeId: { type: 'string', description: 'ID dell\'entrata da eliminare' },
      },
      required: ['incomeId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input) => {
      await prisma.income.delete({ where: { id: input.incomeId as string } })
      return { success: true, data: { deleted: true } }
    },
  },

  // --- create_quote_from_template ---
  {
    name: 'create_quote_from_template',
    description: 'Crea un preventivo a partire da un template predefinito',
    input_schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'ID del template' },
        clientId: { type: 'string', description: 'ID del cliente' },
        title: { type: 'string', description: 'Titolo preventivo (opzionale, usa template)' },
        notes: { type: 'string', description: 'Note aggiuntive (opzionale)' },
      },
      required: ['templateId', 'clientId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input, context) => {
      const template = await prisma.quoteTemplate.findUnique({
        where: { id: input.templateId as string },
        include: { lineItems: true },
      })
      if (!template) return { success: false, error: 'Template non trovato' }

      const lineItems = template.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: Number(li.unitPrice),
        total: li.quantity * Number(li.unitPrice),
      }))
      const subtotal = lineItems.reduce((s, li) => s + li.total, 0)
      const discount = Number(template.defaultDiscount)
      const taxRate = Number(template.defaultTaxRate)
      const taxAmount = (subtotal - discount) * (taxRate / 100)
      const total = subtotal - discount + taxAmount

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const quote = await prisma.$transaction(async (tx) => {
            const year = new Date().getFullYear()
            const prefix = template.numberPrefix
            const count = await tx.quote.count({
              where: { number: { startsWith: `${prefix}-${year}-` } },
            })
            const number = `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`

            return tx.quote.create({
              data: {
                clientId: input.clientId as string,
                creatorId: context.userId,
                templateId: template.id,
                number,
                title: (input.title as string) || `Preventivo ${template.name}`,
                content: lineItems,
                subtotal,
                taxRate,
                taxAmount,
                total,
                discount,
                notes: (input.notes as string) || template.defaultNotes || undefined,
                validUntil: new Date(Date.now() + template.defaultValidDays * 24 * 60 * 60 * 1000),
              },
              select: { id: true, number: true, title: true, total: true, status: true },
            })
          })
          return { success: true, data: { ...quote, total: quote.total.toString() } }
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 2) continue
          throw e
        }
      }
      return { success: false, error: 'Impossibile generare numero preventivo univoco' }
    },
  },

  // --- list_profit_goals ---
  {
    name: 'list_profit_goals',
    description: 'Lista gli obiettivi di profitto mensili',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Anno (opzionale, default anno corrente)' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input) => {
      const year = (input.year as number) || new Date().getFullYear()
      const goals = await prisma.profitGoal.findMany({
        where: { year },
        orderBy: { month: 'asc' },
      })
      return { success: true, data: { goals: goals.map((g) => ({ ...g, amount: g.amount.toString() })), year } }
    },
  },

  // --- set_profit_goal ---
  {
    name: 'set_profit_goal',
    description: 'Imposta o aggiorna l\'obiettivo di profitto per un mese',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Anno' },
        month: { type: 'number', description: 'Mese (1-12)' },
        amount: { type: 'number', description: 'Importo obiettivo' },
      },
      required: ['year', 'month', 'amount'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input) => {
      const goal = await prisma.profitGoal.upsert({
        where: { year_month: { year: input.year as number, month: input.month as number } },
        update: { amount: input.amount as number },
        create: { year: input.year as number, month: input.month as number, amount: input.amount as number },
      })
      return { success: true, data: { ...goal, amount: goal.amount.toString() } }
    },
  },

  // --- list_business_entities ---
  {
    name: 'list_business_entities',
    description: 'Lista le entità aziendali (ragioni sociali/unità di business)',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async () => {
      const entities = await prisma.businessEntity.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      })
      return { success: true, data: { entities, total: entities.length } }
    },
  },

  // --- delete_recurring_invoice ---
  {
    name: 'delete_recurring_invoice',
    description: 'Elimina una fattura/spesa ricorrente',
    input_schema: {
      type: 'object',
      properties: {
        recurringInvoiceId: { type: 'string', description: 'ID della ricorrente da eliminare' },
      },
      required: ['recurringInvoiceId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input) => {
      await prisma.recurringInvoice.delete({ where: { id: input.recurringInvoiceId as string } })
      return { success: true, data: { deleted: true } }
    },
  },

  // --- get_accounting_dashboard ---
  {
    name: 'get_accounting_dashboard',
    description: 'Dashboard contabile: totali entrate/spese, saldo, fatture non pagate, obiettivo profitto',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Anno (default corrente)' },
        month: { type: 'number', description: 'Mese (default corrente)' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input) => {
      const now = new Date()
      const year = (input.year as number) || now.getFullYear()
      const month = (input.month as number) || now.getMonth() + 1
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)

      const [incomes, expenses, unpaidInvoices, profitGoal] = await Promise.all([
        prisma.income.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { amount: true }, _count: true }),
        prisma.expense.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { amount: true }, _count: true }),
        prisma.income.count({ where: { isPaid: false, date: { gte: startDate, lte: endDate } } }),
        prisma.profitGoal.findUnique({ where: { year_month: { year, month } } }),
      ])

      const totalIncome = Number(incomes._sum.amount || 0)
      const totalExpense = Number(expenses._sum.amount || 0)

      return {
        success: true,
        data: {
          period: { year, month },
          totalIncome: totalIncome.toFixed(2),
          totalExpense: totalExpense.toFixed(2),
          profit: (totalIncome - totalExpense).toFixed(2),
          incomeCount: incomes._count,
          expenseCount: expenses._count,
          unpaidInvoices,
          profitGoal: profitGoal ? profitGoal.amount.toString() : null,
        },
      }
    },
  },

  // --- update_quote ---
  {
    name: 'update_quote',
    description: 'Aggiorna i dati di un preventivo (titolo, note, sconto, scadenza)',
    input_schema: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'ID del preventivo' },
        title: { type: 'string' },
        notes: { type: 'string' },
        discount: { type: 'number' },
        validUntil: { type: 'string', description: 'Data scadenza ISO' },
        status: { type: 'string', description: 'Stato: DRAFT, SENT, APPROVED, REJECTED, EXPIRED' },
      },
      required: ['quoteId'],
    },
    module: 'erp',
    requiredPermission: 'write',
    execute: async (input) => {
      const data: Record<string, unknown> = {}
      if (input.title) data.title = input.title
      if (input.notes !== undefined) data.notes = input.notes || null
      if (input.discount !== undefined) data.discount = input.discount
      if (input.validUntil) {
        const parsedDate = parseDate(input.validUntil)
        if (!parsedDate) return INVALID_DATE_ERROR
        data.validUntil = parsedDate
      }
      if (input.status) data.status = input.status

      const quote = await prisma.quote.update({
        where: { id: input.quoteId as string },
        data,
        select: { id: true, number: true, title: true, status: true, total: true, validUntil: true },
      })
      return { success: true, data: { ...quote, total: quote.total.toString() } }
    },
  },
]
