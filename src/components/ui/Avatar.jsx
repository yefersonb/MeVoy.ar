import React from "react";
import { useUser } from "../../contexts/UserContext";

export default function Avatar({ size = 40, editable = false }) {
  const { avatarUrl, loading, uploading, setPreview } = useUser();

  if (loading)
    return <div style={{ width: size, height: size, borderRadius: "50%", background: "#eee" }} />;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", position: "relative" }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#ccc" }}>😎</div>
      )}

      {uploading && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div>⏳</div>
        </div>
      )}

      {editable && (
        <label style={{ position: "absolute", bottom: 0, right: 0, background: "#fff", borderRadius: "50%", padding: 4, cursor: "pointer" }}>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
          ✎
        </label>
      )}
    </div>
  );
}
