// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 👇 APPCHECK (reCAPTCHA v3)
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Para desarrollo en localhost (token de depuración)
if (process.env.NODE_ENV !== "production") {
  // podés usar un string fijo en vez de true si querés reutilizar el mismo token
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const firebaseConfig = {
  apiKey: "AIzaSyAB4c-_srG-k7qmeBQLD_VTrlNwKgQNolU",
  authDomain: "viajes-compartidos-nativa.firebaseapp.com",
  projectId: "viajes-compartidos-nativa",
  // ⚠️ FIX CLAVE: usar firebasestorage.app (no appspot.com)
  storageBucket: "viajes-compartidos-nativa.firebasestorage.app",
  messagingSenderId: "874173356390",
  appId: "1:874173356390:web:dbce62df5f5d7a3e01d0a7",
};

// Evita inicializar dos veces si hay HMR
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// App Check
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("6LcVEa8rAAAAACH2KE_RkhPwnriDsVnHDcQm1QJj"),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// 👇 solo para debug en consola
if (typeof window !== "undefined") {
  window.db = db;
  window.auth = auth;
}


// Opcional: pasar el bucket explícito en formato gs:// (consistente con CORS que ya seteaste)
export const storage = getStorage(app, "gs://viajes-compartidos-nativa.firebasestorage.app");

export default app;

