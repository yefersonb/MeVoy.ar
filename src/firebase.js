// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔐 App Check (reCAPTCHA v3)
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

/**
 * ⚠️ IMPORTANTE
 * - Mantuvimos tus credenciales tal como las pasaste.
 * - Se corrige storageBucket a *.appspot.com (lo correcto para Firebase Storage).
 * - No usamos `db` antes de declararlo (evita "db is not defined").
 * - App Check se inicializa DESPUÉS de initializeApp.
 */

// Config del proyecto (tus datos)
const firebaseConfig = {
  apiKey: "AIzaSyAB4c-_srG-k7qmeBQLD_VTrlNwKgQNolU",
  authDomain: "viajes-compartidos-nativa.firebaseapp.com",
  projectId: "viajes-compartidos-nativa",
  storageBucket: "viajes-compartidos-nativa.firebasestorage.app", // ✅ CORREGIDO (.appspot.com)
  messagingSenderId: "874173356390",
  appId: "1:874173356390:web:dbce62df5f5d7a3e01d0a7",
};

// Evitar doble inicialización (HMR)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// App Check (activar en dev con debug token)
if (typeof window !== "undefined") {
  if (process.env.NODE_ENV !== "production") {
    // podés usar un string fijo si querés reutilizar el mismo token
    // window.FIREBASE_APPCHECK_DEBUG_TOKEN = "tu-token-debug";
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("6LcVEa8rAAAAACH2KE_RkhPwnriDsVnHDcQm1QJj"),
    isTokenAutoRefreshEnabled: true,
  });
}

// SDKs principales (exportados en el orden correcto)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Storage (usa el bucket del config)
export const storage = getStorage(app);

// (Opcional) helpers de debug en consola
if (typeof window !== "undefined") {
  window.auth = auth;
  window.db = db;
  window.storage = storage;
}

export default app;
