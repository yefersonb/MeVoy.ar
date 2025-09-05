// src/lib/storage/selfie.js
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import app from "../../../firebase";

const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

export function pathForSelfie(uid) {
  return `verificaciones/${uid}/selfie/${Date.now()}-selfie.jpg`;
}

export function uploadSelfieWithProgress(file, path, onProgress) {
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, file, { contentType: "image/jpeg" });
  task.on("state_changed", snap => {
    const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
    onProgress?.(pct);
  });
  return new Promise(async (resolve, reject) => {
    try {
      await task;
      const url = await getDownloadURL(fileRef);
      resolve({ url, path });
    } catch (e) {
      reject(e);
    }
  });
}

export async function saveSelfieDoc(uid, { url, path }) {
  const ref = doc(db, "usuarios", uid, "documentos", "selfie");
  await setDoc(ref, { url, path, updatedAt: serverTimestamp() }, { merge: true });
}

export function currentUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No hay usuario autenticado.");
  return uid;
}
