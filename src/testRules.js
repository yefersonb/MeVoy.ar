// src/testRules.js
import { auth, provider, db, storage } from "./firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref as sRef, uploadBytes } from "firebase/storage";

/**
 * Prueba reglas de Firestore y Storage.
 * Expone window.runRulesTest() en desarrollo.
 *
 * Casos:
 *  1) Firestore: escribir en usuarios/{miUid}  -> ✅ debería permitir
 *  2) Firestore: escribir en usuarios/{otroUid} -> 🚫 debería denegar
 *  3) Firestore: escribir en verificaciones/{miUid} -> ✅ debería permitir
 *  4) Firestore: escribir en verificaciones/{otroUid} -> 🚫 debería denegar
 *  5) Storage: subir a verificaciones/{miUid}/selfie/test.txt -> ✅ debería permitir
 *  6) Storage: subir a verificaciones/{otroUid}/selfie/test.txt -> 🚫 debería denegar
 */
export async function runRulesTest() {
  // 0) Asegurar sesión
  let user = auth.currentUser;
  if (!user) {
    console.log("No hay sesión, abriendo popup de Google...");
    const cred = await signInWithPopup(auth, provider);
    user = cred.user;
  }
  const uid = user.uid;
  console.log("✅ Logueado como:", uid);

  // Helper para reportar resultados
  const ok = (label) => console.log(`✅ ${label}`);
  const bad = (label, err) => console.log(`🚫 ${label} — DENEGADO como se esperaba. Mensaje:`, err?.code || err?.message || err);
  const unexpected = (label, err) => console.error(`❌ ${label} — NO debería pasar`, err);

  // 1) Firestore: escribir en MI doc (debe permitir)
  try {
    await setDoc(doc(db, "usuarios", uid), { pruebaOK: serverTimestamp() }, { merge: true });
    ok("Firestore: escribir en usuarios/{miUid}");
  } catch (err) {
    unexpected("Firestore: escribir en usuarios/{miUid}", err);
  }

  // 2) Firestore: escribir en OTRO doc (debe denegar)
  try {
    await setDoc(doc(db, "usuarios", "otroUID_fake_x"), { hack: true }, { merge: true });
    unexpected("Firestore: escribir en usuarios/{otroUid}", "se permitió y NO debía");
  } catch (err) {
    bad("Firestore: escribir en usuarios/{otroUid}", err);
  }

  // 3) Firestore: verificaciones/{miUid} (debe permitir)
  try {
    await setDoc(doc(db, "verificaciones", uid), { touchedAt: serverTimestamp(), status: "incomplete" }, { merge: true });
    const snap = await getDoc(doc(db, "verificaciones", uid));
    ok("Firestore: escribir/leer verificaciones/{miUid}");
    console.log("   Datos actuales verificación:", snap.data());
  } catch (err) {
    unexpected("Firestore: escribir/leer verificaciones/{miUid}", err);
  }

  // 4) Firestore: verificaciones/{otroUid} (debe denegar)
  try {
    await setDoc(doc(db, "verificaciones", "otroUID_fake_y"), { status: "hack" }, { merge: true });
    unexpected("Firestore: escribir verificaciones/{otroUid}", "se permitió y NO debía");
  } catch (err) {
    bad("Firestore: escribir verificaciones/{otroUid}", err);
  }

  // 5) Storage: subir a mi carpeta (debe permitir)
  try {
    const pathOK = `verificaciones/${uid}/selfie/test.txt`;
    await uploadBytes(sRef(storage, pathOK), new Blob(["hola mundo"], { type: "text/plain" }));
    ok(`Storage: upload ${pathOK}`);
  } catch (err) {
    unexpected("Storage: upload en mi carpeta", err);
  }

  // 6) Storage: subir a carpeta de otro (debe denegar)
  try {
    const pathNo = `verificaciones/otroUID_fake_z/selfie/test.txt`;
    await uploadBytes(sRef(storage, pathNo), new Blob(["no deberia"], { type: "text/plain" }));
    unexpected(`Storage: upload ${pathNo}`, "se permitió y NO debía");
  } catch (err) {
    bad("Storage: upload en carpeta de otro UID", err);
  }

  console.log("▶️ Test finalizado.");
}

// Exponer en dev para llamarlo desde consola del navegador
if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  window.runRulesTest = runRulesTest;
  console.log("ℹ️ runRulesTest() disponible en window (dev). Abrí la consola y ejecutá: runRulesTest()");
}
