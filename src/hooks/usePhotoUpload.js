// hooks/usePhotoUpload.js
import { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Hook para subir y previsualizar foto de perfil.
 * @param {string} userId
 * @returns {{ preview: string, uploading: boolean, handlePhotoSelected: function }}
 */
export default function usePhotoUpload(userId) {
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const handlePhotoSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return null;

    // preview local inmediato
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `perfil-fotos/${userId}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPreview(url);
      return url; // quien lo llame debe guardar esto en Firestore
    } catch (err) {
      console.error("Error subiendo foto:", err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { preview, uploading, handlePhotoSelected };
}
