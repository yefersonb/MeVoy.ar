// src/components/verificacion/SelfieUploaderMobile.jsx
import React, { useState } from "react";
import { resizeImage } from "../lib/images/resizeImage";
import { currentUid, pathForSelfie, uploadSelfieWithProgress, saveSelfieDoc } from "../lib/storage/selfie";

export default function SelfieUploaderMobile({ onUploaded }) {
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onPick = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const uid = currentUid();
      const processed = await resizeImage(file, 1280, 0.82);
      const path = pathForSelfie(uid);
      const res = await uploadSelfieWithProgress(processed, path, setProgress);
      await saveSelfieDoc(uid, res);
      onUploaded?.(res); // { url, path }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al subir la selfie");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
      <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
        Selfie de verificación
      </label>
      <input
        type="file"
        accept="image/*"
        capture="user"         // cámara frontal en la mayoría de móviles
        onChange={onPick}
        disabled={busy}
      />
      {preview && (
        <div style={{ marginTop: 12 }}>
          <img src={preview} alt="preview" style={{ maxWidth: 240, borderRadius: 10 }} />
        </div>
      )}
      {busy && <p>Subiendo... {progress}%</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
