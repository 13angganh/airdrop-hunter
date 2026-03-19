// firebase-messaging-sw.js
// Handles: FCM background push + offline cache
// BUILD_TIME is injected by GitHub Actions on every deploy → auto cache-bust

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── CACHE CONFIG ─────────────────────────────────────────────
// __BUILD_TIME__ is replaced by GitHub Actions on every deploy
const BUILD_TIME = '__BUILD_TIME__';
const CACHE_NAME = 'ah-cache-' + BUILD_TIME;

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
      .then(() => self.skipWaiting())
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
    ).then(async () => {
      await self.clients.claim();

      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of allClients) {
        if (client.visibilityState === 'hidden') {
          // App di background → reload otomatis saat dibuka lagi
          client.postMessage({ type: 'AUTO_RELOAD', buildTime: BUILD_TIME });
        } else {
          // App sedang aktif → tampilkan banner
          client.postMessage({ type: 'NEW_VERSION', buildTime: BUILD_TIME });
        }
      }
    })
  );
});

// ── Handle skip waiting dari main thread ──────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── FETCH: network-first untuk HTML, cache-first untuk aset ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Jangan intercept Firebase / Google API
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebase.google.com')
  ) return;

  // index.html → network-first (langsung dapat versi terbaru)
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

  // Aset lain → cache-first
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
let messagingInitialized = false;

try {
  firebase.initializeApp({
    apiKey:            "AIzaSyDt2SfzSUuPSvtRRTOfXNtL50petD_uWBE",
    authDomain:        "airdrop-hunter-2f914.firebaseapp.com",
    databaseURL:       "https://airdrop-hunter-2f914-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "airdrop-hunter-2f914",
    storageBucket:     "airdrop-hunter-2f914.firebasestorage.app",
    messagingSenderId: "1031810722583",
    appId:             "1:1031810722583:web:29e0289ee69a3a4cb9e552",
    measurementId:     "G-GF401D97XL"
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

    const title = notification.title || '🪂 AirdropHunter';
    const body  = notification.body  || 'Ada airdrop baru yang potensial!';
    const icon  = notification.icon  || './icons/icon-192.png';

    self.registration.showNotification(title, {
      body,
      icon,
      badge:    './icons/icon-72.png',
      tag:      'ah-notif-' + Date.now(),
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: data.url || './' },
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
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
