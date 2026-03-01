const CACHE_NAME = 'muscari-os-v4'
const API_CACHE_NAME = 'muscari-os-api-v1'
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.png',
  '/offline.html',
]

// API endpoints to cache with stale-while-revalidate
const CACHEABLE_APIS = [
  '/api/dashboard/summary',
  '/api/tasks/count',
  '/api/chat/channels',
  '/api/notifications',
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
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
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
    const channelMatch = (data.link || '').match(/channel=([^&]+)/)
    options.tag = channelMatch ? `chat-${channelMatch[1]}` : 'chat-message'
    options.renotify = true
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Muscari OS', options)
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

  const url = new URL(event.request.url)

  // Stale-while-revalidate for cacheable API endpoints
  if (url.pathname.startsWith('/api/') && CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone())
              }
              return response
            })
            .catch(() => cached) // If network fails, use cache

          // Return cached immediately, update in background
          return cached || fetchPromise
        })
      )
    )
    return
  }

  // Never intercept other API calls
  if (url.pathname.startsWith('/api/')) return

  // Navigation requests: network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    )
    return
  }

  // Only cache static assets (_next/static, images, fonts)
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
