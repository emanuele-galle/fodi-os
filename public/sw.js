const CACHE_NAME = 'fodi-os-v1'
const SHELL_ASSETS = [
  '/',
  '/dashboard',
  '/tasks',
  '/chat',
  '/manifest.json',
  '/favicon.svg',
  '/logo-fodi.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
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

  const options = {
    body: data.message || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.link || '/dashboard' },
  }

  // For call notifications: add vibration pattern and require interaction
  if (isCall) {
    options.vibrate = [300, 200, 300, 200, 300, 200, 300]
    options.requireInteraction = true
    options.tag = 'incoming-call'
    options.renotify = true
    options.actions = [
      { action: 'answer', title: 'Rispondi' },
      { action: 'dismiss', title: 'Rifiuta' },
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'FODI OS', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Handle call action buttons
  const action = event.action
  const url = action === 'dismiss' ? '/dashboard' : (event.notification.data.url || '/dashboard')

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
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

  // Network-first for API calls
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
