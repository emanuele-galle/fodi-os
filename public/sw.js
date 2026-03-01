const CACHE_NAME = 'muscari-os-v5'
const API_CACHE_NAME = 'muscari-os-api-v2'
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.png',
  '/offline.html',
]

// API endpoints to cache with stale-while-revalidate
const CACHEABLE_APIS = [
  '/api/dashboard/summary',
  '/api/dashboard/badges',
  '/api/tasks/count',
  '/api/chat/channels',
  '/api/notifications',
]

// Maximum age for API cache entries (5 minutes)
const API_CACHE_TTL = 5 * 60 * 1000

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      ),
      // Enable navigation preload if supported
      self.registration.navigationPreload?.enable().catch(() => {}),
    ])
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

  // Stale-while-revalidate for cacheable API endpoints (with TTL)
  if (url.pathname.startsWith('/api/') && CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          // Check if cached response is still within TTL
          const isStale = cached && cached.headers.get('sw-cached-at')
            ? (Date.now() - parseInt(cached.headers.get('sw-cached-at'))) > API_CACHE_TTL
            : true

          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.ok) {
                // Clone and add timestamp header for TTL tracking
                const headers = new Headers(response.headers)
                headers.set('sw-cached-at', String(Date.now()))
                const timedResponse = new Response(response.clone().body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers,
                })
                cache.put(event.request, timedResponse)
              }
              return response
            })
            .catch(() => cached) // If network fails, use cache (even if stale)

          // Return cached if fresh, otherwise fetch from network
          if (cached && !isStale) return cached
          return cached || fetchPromise
        })
      )
    )
    return
  }

  // Never intercept other API calls
  if (url.pathname.startsWith('/api/')) return

  // Navigation requests: use preload response if available, fallback to network then offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse
          if (preloadResponse) return preloadResponse
          return await fetch(event.request)
        } catch {
          return caches.match('/offline.html')
        }
      })()
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
