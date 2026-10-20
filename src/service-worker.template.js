const cachePrefix =
  'nutug-ui-' + encodeURIComponent(new URL(self.registration.scope).pathname) + '-';
const cacheName = cachePrefix + '__VERSION__';
const assetPaths = __ASSETS__;
const urls = assetPaths.map((path) => new URL(path, self.registration.scope).href);
self.addEventListener('install', (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.addAll(urls);
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(cachePrefix) && key !== cacheName) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== new URL(self.registration.scope).origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch {
          const cache = await caches.open(cacheName);
          const page = new URL(event.request.url);
          page.search = '';
          return (
            (await cache.match(page.href)) ||
            cache.match(new URL('index.html', self.registration.scope).href)
          );
        }
      })(),
    );
  } else if (urls.includes(url.href)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(cacheName);
        return (await cache.match(event.request)) || fetch(event.request);
      })(),
    );
  }
});
