// ═══════════════════════════════════════════════════════════════
//  MIURA VALEN — Service Worker
//  Strategy: Cache-first for assets, network-first for Firebase
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'miura-valen-v1';

// Local assets to cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/shell.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/past-papers.js',
  './js/class-papers.js',
  './js/syllabus.js',
  './js/pages.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// External CDN assets to cache
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
];

// ── Install: precache everything ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets (fail silently per item so one missing file doesn't block install)
      const localPromises = PRECACHE_ASSETS.map(url =>
        cache.add(url).catch(() => console.warn('[SW] Failed to cache:', url))
      );
      const cdnPromises = CDN_ASSETS.map(url =>
        cache.add(url).catch(() => console.warn('[SW] Failed to cache CDN:', url))
      );
      return Promise.all([...localPromises, ...cdnPromises]);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: smart routing ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for Firebase (real-time data must be fresh)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebase.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com/identitytoolkit') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Cache-first for everything else (app shell, fonts, chart.js)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch and store
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback: serve index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

