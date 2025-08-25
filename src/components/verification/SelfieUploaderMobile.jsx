// src/components/verification/SelfieUploaderMobile.jsx
// Uploader móvil con cámara frontal, compresión OBLIGATORIA a JPEG <= 2MB
// Llama onUploaded({ url }) cuando termina y guarda en Firestore igual que el wizard.

import React, { useState, useRef } from 'react';
import { auth, db, storage } from '../../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// --- mismo helper de compresión usado en el wizard (copiado para no romper imports)
async function forceCompressTo2MB(file, {
  hardLimitBytes = 2 * 1024 * 1024, // 2MB
  startQuality = 0.82,
  minQuality = 0.35,
  scales = [1, 0.85, 0.7, 0.6, 0.5, 0.4],
} = {}) {
  const loadImageAny = (blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

  let img;
  try {
    img = await loadImageAny(file);
  } catch (e) {
    if (file.size <= hardLimitBytes) return file;
    throw new Error('No se pudo leer la imagen en el navegador.');
  }

  const attemptEncode = (canvas, q) =>
    new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

  const tryOne = async (scale, q) => {
    const cw = Math.max(1, Math.round(img.naturalWidth * scale));
    const ch = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(img, 0, 0, cw, ch);
    const blob = await attemptEncode(canvas, q);
    if (!blob) throw new Error('toBlob falló');
    return new File([blob], (file.name || 'selfie').replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  };

  let best = null;
  let q = startQuality;

  while (q >= minQuality) {
    const out = await tryOne(1, q);
    if (!best || out.size < best.size) best = out;
    if (out.size <= hardLimitBytes) return out;
    q -= 0.1;
  }

  for (const s of scales.slice(1)) {
    q = startQuality;
    while (q >= minQuality) {
      const out = await tryOne(s, q);
      if (!best || out.size < best.size) best = out;
      if (out.size <= hardLimitBytes) return out;
      q -= 0.1;
    }
  }

  throw new Error(`No se pudo comprimir la selfie debajo de 2MB (mejor: ${(best?.size/1048576).toFixed(2)}MB). Probá alejar un poco la cámara y buena luz.`);
}

export default function SelfieUploaderMobile({ onUploaded }) {
  const [progress, setProgress] = useState(undefined);
  const inputRef = useRef(null);

  const uid = auth.currentUser?.uid;
  const COLL = 'verificaciones';
  const STORAGE_ROOT = 'verificaciones';

  const openPicker = () => inputRef.current?.click();

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file || !uid) return;
    const allowed = ['image/jpeg','image/png','image/webp','image/heic','image/heif'];
    if (!allowed.includes(file.type)) {
      alert('Formato no soportado. Subí JPG/PNG/WebP/HEIC.');
      return;
    }

    let processed;
    try {
      setProgress(0);
      processed = await forceCompressTo2MB(file);
    } catch (err) {
      console.error(err);
      alert(err.message || 'No se pudo comprimir la selfie.');
      setProgress(undefined);
      return;
    }

    const safeName = (file.name || 'selfie').replace(/[^\w.\-]+/g, '_').replace(/\.[^.]+$/, '');
    const path = `${STORAGE_ROOT}/${uid}/selfie/${Date.now()}-${safeName}.jpg`;
    const ref = storageRef(storage, path);
    const task = uploadBytesResumable(ref, processed, { contentType: 'image/jpeg' });

    task.on('state_changed',
      (snap) => {
        const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(p);
      },
      (err) => {
        console.error(err);
        alert('Falló la subida de la selfie. Revisá tu conexión.');
        setProgress(undefined);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        try {
          await updateDoc(doc(db, COLL, uid), {
            selfieURL: url,
            updatedAt: serverTimestamp(),
          });
        } catch {
          await setDoc(doc(db, COLL, uid), {
            selfieURL: url,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        setProgress(100);
        onUploaded?.({ url });
      }
    );
  };

  return (
    <div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <button type="button" onClick={openPicker}>Tomar/Seleccionar selfie</button>
        {typeof progress === 'number' && <span style={{color:'var(--color-text-muted)'}}>{progress}%</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={onChange}
        style={{ display:'none' }}
      />
      <p style={{color:'var(--color-text-muted)', marginTop:8}}>
        La selfie se comprime automáticamente y no superará 2MB.
      </p>
    </div>
  );
}
