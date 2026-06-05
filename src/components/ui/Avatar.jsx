import React, { useState } from "react";
import { Camera } from "react-feather";
import { useUser } from "../../contexts/UserContext";
import AvatarCropper from "./AvatarCropper/AvatarCropper";
import "./Avatar.css";

export default function Avatar({ editable = false, onCroppedFile, uploading = false }) {
  const { avatarUrl, loading, setPreview } = useUser();
  const [cropperOpen, setCropperOpen] = useState(false);

  const handleCroppedFile = async (file) => {
    setCropperOpen(false);
    // Optimistic: show the cropped image immediately while upload runs
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    if (onCroppedFile) await onCroppedFile(file);
  };

  const sharedStyle = {
    maxWidth: "100%",
    maxHeight: "100%",
    height: "100%",
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: "50%",
    backgroundColor: "var(--color-surface-alt)",
    display: "block",
  };

  if (loading) return <div style={sharedStyle} />;

  return (
    <>
      <div className={`avatar-wrapper${editable ? " avatar-wrapper--editable" : ""}`}>
        {avatarUrl
          ? <img src={avatarUrl} style={{ ...sharedStyle, objectFit: "cover", objectPosition: "center" }} alt="Foto de perfil" />
          : <div style={sharedStyle} />
        }

        {editable && (
          <button
            className="avatar-edit-btn"
            onClick={() => setCropperOpen(true)}
            disabled={uploading}
            aria-label="Cambiar foto de perfil"
            type="button"
          >
            <span className="avatar-edit-badge">
              {uploading
                ? <span className="avatar-edit-spinner" />
                : <Camera size="55%" strokeWidth={2.5} />
              }
            </span>
          </button>
        )}
      </div>

      {cropperOpen && (
        <AvatarCropper
          onCroppedFile={handleCroppedFile}
          onClose={() => setCropperOpen(false)}
          uploading={uploading}
        />
      )}
    </>
  );
}
