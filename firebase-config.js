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
  apiKey:            "AIzaSyC3tF32e7k0vIbNEPbDhhpJrcSUFjSuQes",
  authDomain:        "solana-memecoin-tracker.firebaseapp.com",
  databaseURL:       "https://solana-memecoin-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "solana-memecoin-tracker",
  storageBucket:     "solana-memecoin-tracker.firebasestorage.app",
  messagingSenderId: "1018565776645",
  appId:             "1:1018565776645:web:80bb90c98efa9027ae936c"
};

window.FCM_VAPID_KEY = "BFOwkG5lrgi5BnRgeX2Gl4jvYyjexU4KyQDTYTWKPbPS6Fmclh7YO1RXndEjDZzvN5wq6m0qjaLqnFpKGsf1wy8";
