import React from "react";
import { useUser } from "../../contexts/UserContext";
import { AlignJustify } from "react-feather";

export default function Avatar({editable = false }) {
  const { avatarUrl, loading, uploading, setPreview } = useUser();

  if (loading) return <div style={{  maxWidth: "100%", maxHeight: "100%", height: "100%", width: "100%", aspectRatio: "1 / 1", borderRadius: "50%", backgroundColor: "#0001" }} />;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  if (avatarUrl) {
    return (<img src={avatarUrl} style={{ maxWidth: "100%", maxHeight: "100%", height: "100%", width: "100%", aspectRatio: "1 / 1", borderRadius: "50%", objectFit: "cover", objectPosition: "center", backgroundColor: "#0001"}}/>)
  }

  return (
    <div style={{  maxWidth: "100%", maxHeight: "100%", height: "100%", width: "100%", aspectRatio: "1 / 1", backgroundColor: "#0001" }}></div>    
  );
}

