import { useRef, useState } from "react";
import { Camera, Image } from "react-feather";
import DocCamera, { ID_CARD_RATIO } from "./DocCamera";

// Editable photo-upload tile: preview box + Cámara/Galería actions.
// Used anywhere a user needs to photograph or pick a document (verification,
// vehicle docs, …) so every doc-capture flow in the app looks and behaves the same.
export function DocTile({
    label,
    url,
    previewUrl,
    progress,
    uploading = false,
    error,
    onSelect,
    accept = "image/*",
    aspectRatio = ID_CARD_RATIO,
}) {
    const fileRef       = useRef(null);
    const [cam, setCam] = useState(false);

    const handleChange = (e) => {
        const file = e.target.files?.[0];
        if (file) onSelect(file);
        e.target.value = "";
    };

    const hasProgress = typeof progress === "number";
    const isBusy       = uploading || (hasProgress && progress < 100);
    const displayUrl   = previewUrl || url;

    return (
        <div className="doc-tile">
            <span className="doc-tile__label">{label}</span>

            <div className={`doc-tile__preview${displayUrl ? " doc-tile__preview--filled" : ""}`}>
                {isBusy ? (
                    <div className="doc-tile__uploading">
                        {hasProgress ? (
                            <>
                                <div className="doc-tile__progress-bar">
                                    <div className="doc-tile__progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <span>{progress}%</span>
                            </>
                        ) : (
                            <span className="doc-tile__spinner" />
                        )}
                    </div>
                ) : displayUrl ? (
                    <img src={displayUrl} alt={label} className="doc-tile__img" />
                ) : (
                    <span className="doc-tile__placeholder">Sin foto</span>
                )}
            </div>

            <div className="doc-tile__actions">
                <button
                    type="button"
                    className="button neutral doc-tile__btn"
                    onClick={() => setCam(true)}
                    disabled={isBusy}
                >
                    <Camera size={14} />
                    Cámara
                </button>
                <button
                    type="button"
                    className="button neutral doc-tile__btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={isBusy}
                >
                    <Image size={14} />
                    Galería
                </button>
            </div>

            {error && <span className="doc-tile__error">{error}</span>}

            <input
                ref={fileRef}
                type="file"
                accept={accept}
                onChange={handleChange}
                style={{ display: "none" }}
            />

            {cam && (
                <DocCamera
                    aspectRatio={aspectRatio}
                    label={`Encuadrá el ${label.toLowerCase()} dentro del marco`}
                    onCapture={(file) => { setCam(false); onSelect(file); }}
                    onCancel={() => setCam(false)}
                />
            )}
        </div>
    );
}

// Read-only doc thumbnail: label + small preview (or an empty state).
export function DocThumb({ label, url }) {
    return (
        <div className="doc-thumb">
            <span className="doc-thumb__label">{label}</span>
            {url ? (
                <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={label} className="doc-thumb__img" />
                </a>
            ) : (
                <div className="doc-thumb__empty">Sin foto</div>
            )}
        </div>
    );
}
