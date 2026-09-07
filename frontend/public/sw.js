const CACHE_NAME = 'agropredict-cache-v1';
const DYNAMIC_CACHE = 'agropredict-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching core offline shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Cache-first for static app assets, Network-first with cache fallback for API calls
  if (req.method === 'GET' && (url.pathname.startsWith('/api/') || url.origin === location.origin)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          console.log('[PWA SW] Serving offline cached data for:', req.url);
          return caches.match(req).then(cachedRes => cachedRes || caches.match('/'));
        })
    );
  }
});
