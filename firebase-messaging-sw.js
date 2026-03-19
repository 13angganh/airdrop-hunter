// firebase-messaging-sw.js
// Handles: FCM background push + offline cache
// BUILD_TIME is injected by GitHub Actions on every deploy → auto cache-bust

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── CACHE CONFIG ─────────────────────────────────────────────
// __BUILD_TIME__ is replaced by GitHub Actions with a real timestamp
// so every deploy gets a unique cache name → old cache auto-evicted
const BUILD_TIME  = '__BUILD_TIME__';
const CACHE_NAME  = 'ah-cache-' + BUILD_TIME;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './firebase-config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── INSTALL: pre-cache static assets ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())  // activate immediately, don't wait
  );
});

// ── ACTIVATE: delete ALL old caches ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => {
      // Take control of all open tabs immediately
      self.clients.claim();
      // Notify all tabs that a new version is available
      self.clients.matchAll({ type: 'window' }).then(clients =>
        clients.forEach(client => client.postMessage({ type: 'NEW_VERSION', buildTime: BUILD_TIME }))
      );
    })
  );
});

// ── FETCH: network-first for HTML, cache-first for assets ────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Never intercept Firebase / Google API calls — let them go direct
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebase.google.com')
  ) return;

  // index.html → network-first (so updates load immediately)
  if (event.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other static assets → cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => null);
    })
  );
});

// ── FCM: Firebase init ────────────────────────────────────────
// PENTING: Ganti config ini dengan config Firebase project kamu!
// (sama persis dengan yang ada di firebase-config.js)
let messagingInitialized = false;

try {
  firebase.initializeApp({
    apiKey:            "AIzaSyC3tF32e7k0vIbNEPbDhhpJrcSUFjSuQes",
    authDomain:        "solana-memecoin-tracker.firebaseapp.com",
    databaseURL:       "https://solana-memecoin-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "solana-memecoin-tracker",
    storageBucket:     "solana-memecoin-tracker.firebasestorage.app",
    messagingSenderId: "1018565776645",
    appId:             "1:1018565776645:web:80bb90c98efa9027ae936c"
  });
  messagingInitialized = true;
} catch (e) {
  console.warn('[SW] Firebase init error:', e.message);
}

// ── FCM: Background message handler ──────────────────────────
if (messagingInitialized) {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(payload => {
    const notification = payload.notification || {};
    const data         = payload.data        || {};

    const title   = notification.title || '🪂 AirdropHunter';
    const body    = notification.body  || 'Ada airdrop baru yang potensial!';
    const icon    = notification.icon  || './icons/icon-192.png';

    self.registration.showNotification(title, {
      body,
      icon,
      badge:     './icons/icon-72.png',
      tag:       'ah-notif-' + Date.now(),
      renotify:  true,
      vibrate:   [200, 100, 200],
      data:      { url: data.url || './' },
      actions: [
        { action: 'open',    title: '🔍 Lihat Sekarang' },
        { action: 'dismiss', title: 'Tutup' }
      ]
    });
  });
}

// ── Notification click ────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing tab if open
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Otherwise open new tab
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
