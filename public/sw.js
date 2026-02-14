const CACHE_NAME = 'fodi-os-v2'
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const isCall = (data.title || '').includes('Chiamata') || (data.title || '').includes('meeting')
  const isChatMessage = (data.title || '').startsWith('Nuovo messaggio da')

  const options = {
    body: data.message || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.link || '/dashboard' },
  }

  if (isCall) {
    options.vibrate = [300, 200, 300, 200, 300, 200, 300]
    options.requireInteraction = true
    options.tag = 'incoming-call'
    options.renotify = true
    options.actions = [
      { action: 'answer', title: 'Rispondi' },
      { action: 'dismiss', title: 'Rifiuta' },
    ]
  } else if (isChatMessage) {
    options.vibrate = [100, 50, 100]
    // Deduplicate by channel (extract channel from link)
    const channelMatch = (data.link || '').match(/channel=([^&]+)/)
    options.tag = channelMatch ? `chat-${channelMatch[1]}` : 'chat-message'
    options.renotify = true
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'FODI OS', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const url = action === 'dismiss' ? '/dashboard' : (event.notification.data.url || '/dashboard')

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // Never intercept API calls or HTML navigation requests
  if (event.request.url.includes('/api/')) return
  if (event.request.mode === 'navigate') return

  // Only cache static assets (_next/static, images, fonts)
  const url = new URL(event.request.url)
  const isStaticAsset = url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|woff2?|ttf|css|js)$/)

  if (!isStaticAsset) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetching = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      return cached || fetching
    })
  )
})
