//src/appCheckDebug.js
/* eslint-env browser */

// Solo en desarrollo y si estás en localhost
if (process.env.NODE_ENV !== "production") {
  const isLocalhost =
    typeof window !== "undefined" &&
    window.location &&
    window.location.hostname === "localhost";

  if (isLocalhost) {
    // Firebase App Check lee este token desde el global del navegador
    window.FIREBASE_APPCHECK_DEBUG_TOKEN =
      "3a9ab3ee-e944-4822-8485-932f5fa9e1bc";
  }
}
