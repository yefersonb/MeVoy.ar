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
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      display: "inline-block",
    }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Foto de perfil"
          style={{
            width: "100%",
            height: "100%",
            aspectRatio: "1 / 1",
            objectFit: "cover", // Keeps the image ratio but crops it
            objectPosition: "center", // Ensures the image is centered if it gets cropped
          }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#eee" }}></div>
      )}
    </div>
  );
}
