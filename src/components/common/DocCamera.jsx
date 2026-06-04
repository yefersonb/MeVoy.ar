import { useEffect, useRef, useState } from "react";
import { X, RotateCcw } from "react-feather";

// Standard ID card / credit card — 85.6 × 54 mm
export const ID_CARD_RATIO = 85.6 / 54;

// ─── Frame size calculator ────────────────────────────────────────────────────
// Finds the largest frame that fits inside the container with margins,
// honouring the aspect ratio. Runs on mount and on resize.
function useFrameSize(containerRef, aspectRatio) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const calc = () => {
            const el = containerRef.current;
            if (!el) return;
            const { width, height } = el.getBoundingClientRect();
            const maxW = width  * 0.84;
            const maxH = height * 0.62; // leave room for controls + hint

            const byWidth  = { w: maxW,             h: maxW / aspectRatio };
            const byHeight = { w: maxH * aspectRatio, h: maxH };

            const { w, h } = byWidth.h <= maxH ? byWidth : byHeight;
            setSize({ width: Math.round(w), height: Math.round(h) });
        };

        calc();
        window.addEventListener("resize", calc);
        return () => window.removeEventListener("resize", calc);
    }, [containerRef, aspectRatio]);

    return size;
}

// ─── Crop + resize helper ─────────────────────────────────────────────────────
function cropVideoToFrame(video, containerEl, frameEl, aspectRatio, maxWidth = 1280) {
    const cRect = containerEl.getBoundingClientRect();
    const fRect = frameEl.getBoundingClientRect();

    const relX = fRect.left - cRect.left;
    const relY = fRect.top  - cRect.top;

    // Map display pixels → video source pixels (video renders as object-fit: cover)
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    const dW = cRect.width;
    const dH = cRect.height;

    let scale, ox, oy;
    if (vW / vH > dW / dH) {
        scale = dH / vH; ox = (dW - vW * scale) / 2; oy = 0;
    } else {
        scale = dW / vW; ox = 0; oy = (dH - vH * scale) / 2;
    }

    const srcX = Math.max(0, (relX - ox) / scale);
    const srcY = Math.max(0, (relY - oy) / scale);
    const srcW = Math.min(vW - srcX, fRect.width  / scale);
    const srcH = Math.min(vH - srcY, fRect.height / scale);

    const outW = Math.min(maxWidth, Math.round(srcW));
    const outH = Math.round(outW / aspectRatio);

    const canvas = document.createElement("canvas");
    canvas.width  = outW;
    canvas.height = outH;
    canvas.getContext("2d").drawImage(video, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
    return canvas;
}

// ─── DocCamera ────────────────────────────────────────────────────────────────
//
// Props:
//   onCapture(file: File)  — called with a cropped + resized JPEG
//   onCancel()             — user dismissed
//   aspectRatio            — frame ratio, defaults to ID_CARD_RATIO
//   label                  — hint text shown below the frame

export default function DocCamera({
    onCapture,
    onCancel,
    aspectRatio = ID_CARD_RATIO,
    label = "Encuadrá el documento dentro del marco",
}) {
    const containerRef = useRef(null);
    const videoRef     = useRef(null);
    const frameRef     = useRef(null);
    const streamRef    = useRef(null);

    const [ready, setReady]     = useState(false);
    const [error, setError]     = useState(null);
    const [preview, setPreview] = useState(null); // { url, file }

    const frame = useFrameSize(containerRef, aspectRatio);

    // Start camera
    useEffect(() => {
        let cancelled = false;

        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Tu dispositivo no soporta acceso a la cámara.");
            return;
        }

        navigator.mediaDevices
            .getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width:  { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            })
            .then(stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => {
                if (cancelled) return;
                setError(
                    err.name === "NotAllowedError"
                        ? "Permiso de cámara denegado. Habilitalo en la configuración."
                        : "No se pudo acceder a la cámara."
                );
            });

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const shoot = () => {
        const video   = videoRef.current;
        const frameEl = frameRef.current;
        const contEl  = containerRef.current;
        if (!video || !frameEl || !contEl || !ready) return;

        const canvas = cropVideoToFrame(video, contEl, frameEl, aspectRatio);
        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `doc-${Date.now()}.jpg`, { type: "image/jpeg" });
            setPreview({ url: URL.createObjectURL(blob), file });
        }, "image/jpeg", 0.88);
    };

    const confirm = () => {
        if (!preview) return;
        onCapture(preview.file);
        URL.revokeObjectURL(preview.url);
    };

    const retake = () => {
        if (preview) URL.revokeObjectURL(preview.url);
        setPreview(null);
    };

    // ── Confirm / preview step ────────────────────────────────────────────────
    if (preview) {
        return (
            <div className="doc-camera doc-camera--preview">
                <img
                    src={preview.url}
                    alt="Vista previa"
                    className="doc-camera__preview-img"
                />
                <p className="doc-camera__preview-label">
                    ¿Se ve bien el documento?
                </p>
                <div className="doc-camera__preview-actions">
                    <button className="button neutral" onClick={retake}>
                        <RotateCcw size={15} /> Reintentar
                    </button>
                    <button className="button" onClick={confirm}>
                        Usar foto
                    </button>
                </div>
            </div>
        );
    }

    // ── Camera view ───────────────────────────────────────────────────────────
    const frameStyle = frame.width > 0 ? {
        width:      frame.width,
        height:     frame.height,
        marginLeft: -frame.width  / 2,
        marginTop:  -frame.height / 2,
    } : { display: "none" };

    return (
        <div className="doc-camera" ref={containerRef}>

            {/* Live stream */}
            <video
                ref={videoRef}
                className="doc-camera__video"
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setReady(true)}
            />

            {/* Error overlay */}
            {error && (
                <div className="doc-camera__error">
                    <p>{error}</p>
                    <button className="button neutral" onClick={onCancel}>Volver</button>
                </div>
            )}

            {/* Document frame + vignette */}
            {!error && frame.width > 0 && (
                <div
                    ref={frameRef}
                    className="doc-camera__frame"
                    style={frameStyle}
                >
                    <div className="doc-camera__corner doc-camera__corner--tl" />
                    <div className="doc-camera__corner doc-camera__corner--tr" />
                    <div className="doc-camera__corner doc-camera__corner--bl" />
                    <div className="doc-camera__corner doc-camera__corner--br" />
                </div>
            )}

            {/* Hint */}
            {!error && (
                <p className="doc-camera__hint">{label}</p>
            )}

            {/* Shutter controls */}
            <div className="doc-camera__controls">
                <button
                    className="doc-camera__cancel-btn"
                    onClick={onCancel}
                    aria-label="Cancelar"
                >
                    <X size={22} />
                </button>
                <button
                    className="doc-camera__shutter"
                    onClick={shoot}
                    disabled={!ready || !!error}
                    aria-label="Tomar foto"
                />
                {/* Spacer keeps shutter centered */}
                <div className="doc-camera__shutter-spacer" />
            </div>

        </div>
    );
}
