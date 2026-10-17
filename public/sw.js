// PrepaBAC offline shell. API calls and hashed build assets are never served from cache:
// /api/* always goes to the network (student progress must not be shared between devices),
// and navigation requests are network-first so a deploy is visible on the next open.
const CACHE = 'prepabac-v4'
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/apple-icon.png']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
    ]),
  )
})

self.addEventListener('fetch', (e) => {
  const request = e.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return // never cache the database responses

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((response) => {
          // Seule la page de l'élève sert de coquille hors ligne : /admin et /prof ne doivent jamais
          // remplacer l'app dans le cache, sinon le hors-ligne afficherait une console.
          if (url.pathname === '/') {
            const copy = response.clone()
            caches.open(CACHE).then((c) => c.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith('/_next/static/')) {
            const copy = response.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return response
        }),
    ),
  )
})
