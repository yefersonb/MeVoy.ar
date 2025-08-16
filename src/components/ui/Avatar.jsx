import React from "react";
import { useUser } from "../../contexts/UserContext";

export default function Avatar({ size = "100%", editable = false }) {
  const { avatarUrl, loading, uploading, setPreview } = useUser();

  if (loading) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#eee" }} />;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    avatarUrl ? (
      <img src={avatarUrl} alt="Foto de perfil" style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%"}} />
    ) : (
      <div style={{ width: size, height: size, background: "#eee", borderRadius: "50%" }}></div>
    )
  );
}
