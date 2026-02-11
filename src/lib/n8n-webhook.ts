export async function triggerWebhook(path: string, data: Record<string, unknown>): Promise<void> {
  const baseUrl = process.env.N8N_WEBHOOK_URL
  if (!baseUrl) return

  try {
    await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error(`[n8n-webhook] Failed to trigger ${path}:`, error)
  }
}
