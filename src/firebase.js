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
  storageBucket: "viajes-compartidos-nativa.appspot.com", // <= CORRECTO
  messagingSenderId: "874173356390",
  appId: "1:874173356390:web:dbce62df5f5d7a3e01d0a7",
};

// Toggle: 1=activa AppCheck en dev, 0=desactiva
// Cambiá en tu .env local: REACT_APP_ENABLE_APPCHECK=0 (para que arranque YA)
const ENABLE_APPCHECK =
  (process.env.REACT_APP_ENABLE_APPCHECK ?? "1").trim() === "1";

// ==========================
// INIT
// ==========================
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// — AppCheck listo (promesa) —
// Si está desactivado en dev, resolvemos al toque.
export const appCheckReady = new Promise((resolve) => {
  if (typeof window === "undefined") return resolve();

  if (!ENABLE_APPCHECK || process.env.NODE_ENV !== "production") {
    // Modo DEV sin AppCheck: no pedimos token, seguimos.
    if (!ENABLE_APPCHECK) {
      console.info("AppCheck desactivado en DEV (REACT_APP_ENABLE_APPCHECK=0).");
      return resolve();
    }
  }

  try {
    if (process.env.NODE_ENV !== "production") {
      // Podés fijarlo a tu token si querés: window.FIREBASE_APPCHECK_DEBUG_TOKEN = "3167a15f-4d46-4875-9da0-e79988fe9c2e";
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const provider = new ReCaptchaV3Provider(
      process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY
        || "6LcVEa8rAAAAACH2KE_RkhPwnriDsVnHDcQm1QJj" // fallback a tu clave
    );

    const appCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    // Aseguramos primer token ANTES de seguir:
    onTokenChanged(appCheck, async (result) => {
      if (result?.token) {
        resolve();
      }
    });

    // Dispara la obtención del primer token:
    getToken(appCheck).catch(() => {
      // Si falla, igual resolvemos para no bloquear dev
      resolve();
    });
  } catch (e) {
    console.warn("AppCheck init warning:", e);
    resolve();
  }
});

// ==========================
// SDKs (usarlos DESPUÉS de appCheckReady)
// ==========================
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Helpers debug
if (typeof window !== "undefined") {
  window.auth = auth;
  window.db = db;
  window.storage = storage;
  console.log("Firebase appId:", app.options.appId);
}

export default app;
