// ═══════════════════════════════════════════════════════════════
//  MIURA VALEN — Service Worker
//  JS/HTML files: always network-first (so updates are instant)
//  CSS/fonts/icons: cache-first (rarely change)
//  Firebase/Gemini: always network (never cache)
// ═══════════════════════════════════════════════════════════════
/* eslint-disable no-restricted-globals */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
const _self = /** @type {ServiceWorkerGlobalScope} */ (self);

// !! Bump this date any time you deploy to force cache refresh !!
const CACHE_VERSION = '2026-03-13';
const CACHE_NAME    = 'miura-valen-' + CACHE_VERSION;

// Only cache things that truly never change between deploys
const STATIC_ASSETS = [
  './css/style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
];

// ── Install ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => console.warn('[SW] skip:', url)))
      ))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete ALL old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      })))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 1. Never intercept Firebase, Gemini, or auth requests
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebase.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com/identitytoolkit') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  // 2. JS and HTML: always network-first so updates land immediately
  if (url.endsWith('.js') || url.endsWith('.html') || url.endsWith('/') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. CSS, fonts, icons, CDN: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'error') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
        }
        return response;
      });
    })
  );
});