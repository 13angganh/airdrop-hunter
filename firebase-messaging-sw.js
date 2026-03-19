// firebase-messaging-sw.js
// Cache version di-inject otomatis oleh Cloudflare Pages setiap deploy

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── CACHE CONFIG ──────────────────────────────────────────────
// CLOUDFLARE_BUILD_TIME diganti otomatis saat deploy
// Tidak perlu ubah manual — otomatis setiap push
const CACHE_NAME = 'ah-CLOUDFLARE_BUILD_TIME';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/firebase-config.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: hapus cache lama ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(async () => {
      await self.clients.claim();
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.visibilityState === 'hidden') {
          client.postMessage({ type: 'AUTO_RELOAD' });
        } else {
          client.postMessage({ type: 'NEW_VERSION' });
        }
      }
    })
  );
});

// ── SKIP WAITING ──────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') ||
      url.includes('gstatic.com') || url.includes('firebase.google.com')) return;

  if (event.request.mode === 'navigate' || url.endsWith('/') || url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }).catch(() => null);
    })
  );
});

// ── FCM INIT ──────────────────────────────────────────────────
let fcmReady = false;
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
  fcmReady = true;
} catch(e) {
  console.warn('[SW] Firebase:', e.message);
}

// ── FCM BACKGROUND ────────────────────────────────────────────
if (fcmReady) {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || '🪂 AirdropHunter', {
      body:    n.body || 'Ada airdrop baru!',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-72.png',
      tag:     'ah-' + Date.now(),
      vibrate: [200, 100, 200],
      data:    { url: (payload.data && payload.data.url) || '/' },
      actions: [{ action: 'open', title: '🔍 Lihat' }, { action: 'dismiss', title: 'Tutup' }]
    });
  });
}

// ── NOTIF CLICK ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
