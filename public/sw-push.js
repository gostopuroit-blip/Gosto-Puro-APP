// Service Worker injetado via vite-plugin-pwa (injectManifest mode)
// Combina: precache (workbox) + listeners de push notifications
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache de todos assets buildados (gerado pelo vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache de imagens de receita (Supabase Storage) — CacheFirst com expiração 30 dias
registerRoute(
  ({ url }) => url.hostname.includes('twkftwjsvhlczwlhdwzu.supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'recipe-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

// Cache de respostas da API Supabase (REST) — SWR pra parecer rápido
registerRoute(
  ({ url }) => url.hostname.includes('twkftwjsvhlczwlhdwzu.supabase.co') && url.pathname.includes('/rest/v1/'),
  new StaleWhileRevalidate({ cacheName: 'supabase-api' })
);

// === PUSH NOTIFICATIONS ===

self.addEventListener('push', (event) => {
  let data = { title: 'Gosto Puro', body: 'Hai una nuova notifica!' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image || undefined,
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'gosto-puro',
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Se já tem janela aberta, foca; senão abre nova
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Skip waiting + claim — ativa a nova versão na hora
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
