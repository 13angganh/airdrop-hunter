// ═══════════════════════════════════════════════════════════════
//  firebase-config.js  —  WAJIB diisi sebelum deploy!
//
//  Cara ambil config:
//  Firebase Console → Project Settings → Your apps → SDK setup
//
//  Cara ambil VAPID key:
//  Firebase Console → Project Settings → Cloud Messaging
//  → Web Push certificates → Generate key pair
// ═══════════════════════════════════════════════════════════════

window.FIREBASE_CONFIG = {
  apiKey:            "GANTI_API_KEY",
  authDomain:        "GANTI.firebaseapp.com",
  databaseURL:       "https://GANTI-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "GANTI",
  storageBucket:     "GANTI.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId:             "GANTI_APP_ID"
};

window.FCM_VAPID_KEY = "GANTI_VAPID_KEY";
