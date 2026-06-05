// hooks/usePhotoUpload.js
import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

export default function usePhotoUpload(userId) {
  const [uploading, setUploading] = useState(false);

  const uploadCroppedFile = async (file) => {
    if (!file || !userId) return null;

    setUploading(true);
    try {
      const storageRef = ref(storage, `usuarios/${userId}/perfil-foto`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.error("Photo upload failed:", err.code, err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadCroppedFile };
}
