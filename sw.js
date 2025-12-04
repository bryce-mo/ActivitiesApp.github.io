/* sw.js — Scorekeeper PWA Service Worker */

const CACHE_VERSION = 'scorekeeper-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

/* INSTALL: cache the app shell */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
});

/* ACTIVATE: clean up old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* FETCH: offline-first strategy */
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignore non-GET requests (IndexedDB, etc.)
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(networkRes => {
          // Cache successful same-origin responses
          if (
            networkRes &&
            networkRes.status === 200 &&
            req.url.startsWith(self.location.origin)
          ) {
            const clone = networkRes.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          // Optional fallback: app shell for navigation requests
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

/* MESSAGE: Handle client requests (e.g., clearing all caches) */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    // This is the core logic for clearing ALL caches
    event.waitUntil(
      caches.keys().then(keys => {
        // Delete every cache key known to the service worker
        return Promise.all(keys.map(key => caches.delete(key)));
      })
    );
  }
});