// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// App Check
import { initializeAppCheck, ReCaptchaV3Provider, onTokenChanged, getToken } from "firebase/app-check";

// ==========================
// CONFIG
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyAB4c-_srG-k7qmeBQLD_VTrlNwKgQNolU",
  authDomain: "viajes-compartidos-nativa.firebaseapp.com",
  projectId: "viajes-compartidos-nativa",
  storageBucket: "viajes-compartidos-nativa.firebasestorage.app",
  messagingSenderId: "874173356390",
  appId: "1:874173356390:web:dbce62df5f5d7a3e01d0a7",
};

// Toggle: 1=enable AppCheck in dev, 0=disable
// Set in .env local: VITE_ENABLE_APPCHECK=0 to skip AppCheck
const ENABLE_APPCHECK =
  (import.meta.env.VITE_ENABLE_APPCHECK ?? "1").trim() === "1";

// ==========================
// INIT
// ==========================
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// — AppCheck ready (promise) —
// If disabled in dev, resolve immediately.
export const appCheckReady = new Promise((resolve) => {
  if (typeof window === "undefined") return resolve();

  if (!ENABLE_APPCHECK || import.meta.env.DEV) {
    // DEV mode without AppCheck: skip token, continue.
    if (!ENABLE_APPCHECK) {
      console.info("AppCheck disabled in DEV (VITE_ENABLE_APPCHECK=0).");
      return resolve();
    }
  }

  try {
    if (import.meta.env.DEV) {
      // To use a specific token: window.FIREBASE_APPCHECK_DEBUG_TOKEN = "3167a15f-4d46-4875-9da0-e79988fe9c2e";
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const provider = new ReCaptchaV3Provider(
      import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY
        || "6LcVEa8rAAAAACH2KE_RkhPwnriDsVnHDcQm1QJj" // fallback key
    );

    const appCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    // Ensure first token BEFORE proceeding:
    onTokenChanged(appCheck, async (result) => {
      if (result?.token) {
        resolve();
      }
    });

    // Trigger first token fetch:
    getToken(appCheck).catch(() => {
      // On failure, still resolve to avoid blocking dev
      resolve();
    });
  } catch (e) {
    console.warn("AppCheck init warning:", e);
    resolve();
  }
});

// ==========================
// SDKs (use AFTER appCheckReady)
// ==========================
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const storage = getStorage(app);

// Helpers debug
if (typeof window !== "undefined") {
  window.auth = auth;
  window.db = db;
  window.storage = storage;
  console.log("Firebase appId:", app.options.appId);
}

export default app;
