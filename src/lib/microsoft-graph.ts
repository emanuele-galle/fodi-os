import { prisma } from './prisma'
import { logger } from '@/lib/logger'

// Microsoft OAuth2 endpoints for personal accounts
const AUTHORITY = 'https://login.microsoftonline.com/consumers'
const AUTH_URL = `${AUTHORITY}/oauth2/v2.0/authorize`
const TOKEN_URL = `${AUTHORITY}/oauth2/v2.0/token`
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

const SCOPES = ['Tasks.ReadWrite', 'User.Read', 'offline_access']

if (!process.env.MICROSOFT_CLIENT_ID) {
  logger.warn('[microsoft] MICROSOFT_CLIENT_ID non configurato. Integrazione Microsoft To Do disabilitata.')
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: getMicrosoftRedirectUri(),
    scope: SCOPES.join(' '),
    response_mode: 'query',
    state,
  })
  return `${AUTH_URL}?${params}`
}

function getMicrosoftRedirectUri(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${siteUrl}/api/integrations/microsoft/callback`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      code,
      redirect_uri: getMicrosoftRedirectUri(),
      grant_type: 'authorization_code',
      scope: SCOPES.join(' '),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Microsoft token exchange failed: ${err}`)
  }
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
  }>
}

async function refreshAccessToken(userId: string): Promise<string> {
  const token = await prisma.microsoftToken.findUnique({ where: { userId } })
  if (!token) throw new Error('Microsoft token not found')

  // If token is still valid (with 5-min buffer), return it
  if (token.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return token.accessToken
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES.join(' '),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    logger.error(`[microsoft] Token refresh failed for user ${userId}: ${err}`)
    throw new Error('Microsoft token refresh failed')
  }

  const data = await res.json()
  await prisma.microsoftToken.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || token.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope || token.scope,
    },
  })

  return data.access_token
}

// ---------------------------------------------------------------------------
// Graph API caller
// ---------------------------------------------------------------------------

async function graphFetch(userId: string, path: string, options: RequestInit = {}) {
  const accessToken = await refreshAccessToken(userId)
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

export async function getMicrosoftUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.mail || data.userPrincipalName || null
}

// ---------------------------------------------------------------------------
// To Do Lists
// ---------------------------------------------------------------------------

export async function getOrCreateTodoList(userId: string, listName: string): Promise<string> {
  // Check if we already have the list ID cached
  const token = await prisma.microsoftToken.findUnique({ where: { userId } })
  if (token?.todoListId) return token.todoListId

  // Search for existing list
  const listsRes = await graphFetch(userId, '/me/todo/lists')
  if (!listsRes.ok) throw new Error('Failed to fetch To Do lists')
  const lists = await listsRes.json()
  const existing = lists.value?.find((l: { displayName: string }) => l.displayName === listName)

  if (existing) {
    await prisma.microsoftToken.update({ where: { userId }, data: { todoListId: existing.id } })
    return existing.id
  }

  // Create new list
  const createRes = await graphFetch(userId, '/me/todo/lists', {
    method: 'POST',
    body: JSON.stringify({ displayName: listName }),
  })
  if (!createRes.ok) throw new Error('Failed to create To Do list')
  const newList = await createRes.json()
  await prisma.microsoftToken.update({ where: { userId }, data: { todoListId: newList.id } })
  return newList.id
}

// ---------------------------------------------------------------------------
// To Do Tasks CRUD
// ---------------------------------------------------------------------------

interface TodoTaskInput {
  title: string
  body?: string | null
  status: 'notStarted' | 'inProgress' | 'completed'
  importance: 'low' | 'normal' | 'high'
  dueDateTime?: string | null // ISO date string
  linkedUrl?: string
}

function buildTodoTaskBody(input: TodoTaskInput) {
  const body: Record<string, unknown> = {
    title: input.title,
    status: input.status,
    importance: input.importance,
  }

  if (input.body) {
    body.body = { content: input.body, contentType: 'text' }
  }

  if (input.dueDateTime) {
    body.dueDateTime = {
      dateTime: input.dueDateTime,
      timeZone: 'Europe/Rome',
    }
  }

  if (input.linkedUrl) {
    body.linkedResources = [{
      webUrl: input.linkedUrl,
      applicationName: process.env.NEXT_PUBLIC_BRAND_NAME || 'FODI OS',
      displayName: 'Apri nel gestionale',
    }]
  }

  return body
}

export async function createTodoTask(userId: string, listId: string, input: TodoTaskInput): Promise<string> {
  const res = await graphFetch(userId, `/me/todo/lists/${listId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(buildTodoTaskBody(input)),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create To Do task: ${err}`)
  }
  const data = await res.json()
  return data.id
}

export async function updateTodoTask(userId: string, listId: string, todoTaskId: string, input: Partial<TodoTaskInput>): Promise<void> {
  const body: Record<string, unknown> = {}
  if (input.title !== undefined) body.title = input.title
  if (input.status !== undefined) body.status = input.status
  if (input.importance !== undefined) body.importance = input.importance
  if (input.body !== undefined) {
    body.body = input.body ? { content: input.body, contentType: 'text' } : { content: '', contentType: 'text' }
  }
  if (input.dueDateTime !== undefined) {
    body.dueDateTime = input.dueDateTime
      ? { dateTime: input.dueDateTime, timeZone: 'Europe/Rome' }
      : null
  }

  const res = await graphFetch(userId, `/me/todo/lists/${listId}/tasks/${todoTaskId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to update To Do task: ${err}`)
  }
}

export async function deleteTodoTask(userId: string, listId: string, todoTaskId: string): Promise<void> {
  const res = await graphFetch(userId, `/me/todo/lists/${listId}/tasks/${todoTaskId}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    throw new Error('Failed to delete To Do task')
  }
}

async function getTodoTask(userId: string, listId: string, todoTaskId: string) {
  const res = await graphFetch(userId, `/me/todo/lists/${listId}/tasks/${todoTaskId}`)
  if (!res.ok) return null
  return res.json()
}

export async function listTodoTasks(userId: string, listId: string) {
  const allTasks: Array<{
    id: string
    title: string
    status: string
    importance: string
    body?: { content: string }
    dueDateTime?: { dateTime: string }
    lastModifiedDateTime: string
    completedDateTime?: { dateTime: string }
  }> = []

  let url: string | null = `/me/todo/lists/${listId}/tasks?$top=100`
  while (url) {
    const res = await graphFetch(userId, url)
    if (!res.ok) throw new Error('Failed to list To Do tasks')
    const data = await res.json()
    if (data.value) allTasks.push(...data.value)
    // Handle @odata.nextLink for pagination
    if (data['@odata.nextLink']) {
      // nextLink is a full URL, extract the path
      const nextUrl = new URL(data['@odata.nextLink'])
      url = nextUrl.pathname.replace('/v1.0', '') + nextUrl.search
    } else {
      url = null
    }
  }

  return allTasks
}

// ---------------------------------------------------------------------------
// Webhooks (change notifications)
// ---------------------------------------------------------------------------

export async function createWebhookSubscription(userId: string, listId: string, webhookUrl: string): Promise<{ subscriptionId: string; expiry: Date }> {
  // Microsoft To Do webhook subscriptions expire after max 4230 minutes (~2.94 days)
  const expirationDateTime = new Date(Date.now() + 4230 * 60 * 1000 - 60000).toISOString()

  const res = await graphFetch(userId, '/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      changeType: 'created,updated,deleted',
      notificationUrl: webhookUrl,
      resource: `/me/todo/lists/${listId}/tasks`,
      expirationDateTime,
      clientState: `ms-todo-${userId}`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create webhook subscription: ${err}`)
  }

  const data = await res.json()
  const expiry = new Date(data.expirationDateTime)

  await prisma.microsoftToken.update({
    where: { userId },
    data: { webhookSubId: data.id, webhookExpiry: expiry },
  })

  return { subscriptionId: data.id, expiry }
}

export async function renewWebhookSubscription(userId: string): Promise<void> {
  const token = await prisma.microsoftToken.findUnique({ where: { userId } })
  if (!token?.webhookSubId) return

  const expirationDateTime = new Date(Date.now() + 4230 * 60 * 1000 - 60000).toISOString()

  const res = await graphFetch(userId, `/subscriptions/${token.webhookSubId}`, {
    method: 'PATCH',
    body: JSON.stringify({ expirationDateTime }),
  })

  if (!res.ok) {
    // Subscription may have expired, try to recreate
    logger.warn(`[microsoft] Webhook renewal failed for user ${userId}, will recreate on next sync`)
    await prisma.microsoftToken.update({
      where: { userId },
      data: { webhookSubId: null, webhookExpiry: null },
    })
    return
  }

  const data = await res.json()
  await prisma.microsoftToken.update({
    where: { userId },
    data: { webhookExpiry: new Date(data.expirationDateTime) },
  })
}

export async function deleteWebhookSubscription(userId: string): Promise<void> {
  const token = await prisma.microsoftToken.findUnique({ where: { userId } })
  if (!token?.webhookSubId) return

  await graphFetch(userId, `/subscriptions/${token.webhookSubId}`, {
    method: 'DELETE',
  }).catch(() => {})

  await prisma.microsoftToken.update({
    where: { userId },
    data: { webhookSubId: null, webhookExpiry: null },
  })
}

// ---------------------------------------------------------------------------
// Status / config check
// ---------------------------------------------------------------------------

export function isMicrosoftConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
}
