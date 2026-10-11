/// <reference lib="webworker" />
// The app's service worker: offline caching (as before) plus push notifications.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// Offline: precache the built app and serve index.html for every page.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// New versions take over straight away (the app reloads itself).
self.skipWaiting()
clientsClaim()

interface PushData {
  title?: string
  body?: string
  room?: string
  kind?: string
}

self.addEventListener('push', (event) => {
  let data: PushData = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Running Low', {
      body: data.body || undefined,
      icon: '/pwa-192x192.png?v=basket',
      badge: '/pwa-64x64.png?v=basket',
      // Item adds replace each other instead of piling up.
      tag: data.kind === 'items' ? 'items' : undefined,
      data: { room: data.room ?? 'home' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const room = (event.notification.data as { room?: string } | null)?.room ?? 'home'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows[0]
      if (open) {
        await open.focus()
        open.postMessage({ type: 'open-room', room })
        return
      }
      await self.clients.openWindow(`/?room=${encodeURIComponent(room)}`)
    })(),
  )
})
