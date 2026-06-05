import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Camera, Image as ImageIcon, X, Check, ZoomIn } from "react-feather";
import "./AvatarCropper.css";

// ─── Math ────────────────────────────────────────────────────────────────────

function clampOffset(ox, oy, scale, nw, nh, cSize) {
  const maxX = Math.max(0, (nw * scale - cSize) / 2);
  const maxY = Math.max(0, (nh * scale - cSize) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, ox)),
    y: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

// Returns crop rect in natural image pixels
function computeCrop(offset, scale, nw, nh, cSize) {
  const imageLeft = cSize / 2 + offset.x - (nw * scale) / 2;
  const imageTop  = cSize / 2 + offset.y - (nh * scale) / 2;
  return {
    x: Math.max(0, -imageLeft / scale),
    y: Math.max(0, -imageTop  / scale),
    w: cSize / scale,
    h: cSize / scale,
  };
}

async function renderCrop(imageSrc, crop, outputSize = 512) {
  const img = await new Promise((res, rej) => {
    const el = new window.Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width  = outputSize;
  canvas.height = outputSize;
  canvas.getContext("2d").drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, outputSize, outputSize);
  return new Promise((res) =>
    canvas.toBlob(
      (blob) => res(new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" })),
      "image/jpeg", 0.88
    )
  );
}

// ─── Interactive crop canvas ─────────────────────────────────────────────────

function ImageCropCanvas({ imageSrc, onCropChange }) {
  const containerRef  = useRef(null);
  const [cSize, setCSize]           = useState(0);
  const [naturalSize, setNatural]   = useState(null);
  const [offset, setOffset]         = useState({ x: 0, y: 0 });
  const [scale,  setScale]          = useState(1);

  // Refs so pointer handlers always read current values (no stale closure)
  const offsetRef   = useRef({ x: 0, y: 0 });
  const scaleRef    = useRef(1);
  const dragRef     = useRef(null);   // { startX, startY, startOX, startOY }
  const pinchRef    = useRef(null);   // { startDist, startScale }
  const ptrsRef     = useRef(new Map());

  const setO = (o) => { offsetRef.current = o; setOffset(o); };
  const setS = (s) => { scaleRef.current  = s; setScale(s);  };

  useEffect(() => {
    if (containerRef.current) setCSize(containerRef.current.offsetWidth);
  }, []);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageSrc;
  }, [imageSrc]);

  const minScale = useMemo(() => {
    if (!naturalSize || !cSize) return 1;
    return Math.max(cSize / naturalSize.w, cSize / naturalSize.h);
  }, [naturalSize, cSize]);

  // Center + fit when image/container size first known
  useEffect(() => {
    if (!naturalSize || !cSize) return;
    const s = Math.max(cSize / naturalSize.w, cSize / naturalSize.h);
    setS(s);
    setO({ x: 0, y: 0 });
  }, [naturalSize, cSize]); // eslint-disable-line

  // Report crop upstream whenever transform changes
  useEffect(() => {
    if (!naturalSize || !cSize) return;
    onCropChange(computeCrop(offset, scale, naturalSize.w, naturalSize.h, cSize));
  }, [offset, scale, naturalSize, cSize]); // eslint-disable-line

  // ── Pointer handlers ──────────────────────────────────────────────────────

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrsRef.current.size === 1) {
      dragRef.current = {
        startX: e.clientX, startY: e.clientY,
        startOX: offsetRef.current.x, startOY: offsetRef.current.y,
      };
      pinchRef.current = null;
    } else {
      dragRef.current = null;
      const pts = [...ptrsRef.current.values()];
      pinchRef.current = {
        startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        startScale: scaleRef.current,
      };
    }
  }, []);

  const onPointerMove = useCallback((e) => {
    e.preventDefault();
    ptrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!naturalSize || !cSize) return;

    const min = Math.max(cSize / naturalSize.w, cSize / naturalSize.h);

    if (ptrsRef.current.size === 1 && dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setO(clampOffset(
        dragRef.current.startOX + dx,
        dragRef.current.startOY + dy,
        scaleRef.current, naturalSize.w, naturalSize.h, cSize
      ));
    } else if (ptrsRef.current.size === 2 && pinchRef.current) {
      const pts = [...ptrsRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const s = Math.max(min, Math.min(4, pinchRef.current.startScale * dist / pinchRef.current.startDist));
      setS(s);
      setO(clampOffset(offsetRef.current.x, offsetRef.current.y, s, naturalSize.w, naturalSize.h, cSize));
    }
  }, [naturalSize, cSize]);

  const onPointerUp = useCallback((e) => {
    ptrsRef.current.delete(e.pointerId);
    if (ptrsRef.current.size === 1) {
      // Finger lifted during pinch — resume drag from remaining finger
      const [id, pos] = [...ptrsRef.current.entries()][0];
      dragRef.current = { startX: pos.x, startY: pos.y, startOX: offsetRef.current.x, startOY: offsetRef.current.y };
      pinchRef.current = null;
    } else if (ptrsRef.current.size === 0) {
      dragRef.current = pinchRef.current = null;
    }
  }, []);

  const onZoomSlider = useCallback((e) => {
    if (!naturalSize || !cSize) return;
    const s = Number(e.target.value);
    setS(s);
    setO(clampOffset(offsetRef.current.x, offsetRef.current.y, s, naturalSize.w, naturalSize.h, cSize));
  }, [naturalSize, cSize]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!naturalSize || !cSize) return <div ref={containerRef} className="avc-canvas" />;

  const sw = naturalSize.w * scale;
  const sh = naturalSize.h * scale;

  return (
    <>
      <div
        ref={containerRef}
        className="avc-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: "grab", touchAction: "none", userSelect: "none" }}
      >
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            width:  sw,
            height: sh,
            left:   cSize / 2 + offset.x - sw / 2,
            top:    cSize / 2 + offset.y - sh / 2,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
        {/* Circular crop mask — darkens everything outside the circle */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          pointerEvents: "none",
        }} />
      </div>

      <div className="avc-zoom-row">
        <ZoomIn size={16} className="avc-zoom-icon" />
        <input
          type="range"
          min={minScale}
          max={Math.max(minScale * 3, 4)}
          step={0.001}
          value={scale}
          onChange={onZoomSlider}
          className="avc-zoom-slider"
          aria-label="Zoom"
        />
      </div>
    </>
  );
}

// ─── Source picker ────────────────────────────────────────────────────────────

function SourcePicker({ onCamera, onGallery, onClose }) {
  return (
    <div className="avc-overlay" onClick={onClose}>
      <div className="avc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="avc-sheet__header">
          <span className="avc-sheet__title">Cambiar foto de perfil</span>
          <button className="avc-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <p className="avc-sheet__hint">¿De dónde querés usar la foto?</p>
        <div className="avc-source-row">
          <button className="avc-source-btn" onClick={onCamera}>
            <span className="avc-source-btn__icon"><Camera   size={28} strokeWidth={1.5} /></span>
            <span className="avc-source-btn__label">Cámara</span>
          </button>
          <button className="avc-source-btn" onClick={onGallery}>
            <span className="avc-source-btn__icon"><ImageIcon size={28} strokeWidth={1.5} /></span>
            <span className="avc-source-btn__label">Galería</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Crop step ────────────────────────────────────────────────────────────────

function CropStep({ imageSrc, onConfirm, onCancel, uploading }) {
  const cropRef = useRef(null);

  const handleConfirm = async () => {
    if (!cropRef.current) return;
    const file = await renderCrop(imageSrc, cropRef.current);
    onConfirm(file);
  };

  return (
    <div className="avc-overlay">
      <div className="avc-sheet avc-sheet--crop">
        <div className="avc-sheet__header">
          <span className="avc-sheet__title">Recortá tu foto</span>
          <button className="avc-icon-btn" onClick={onCancel} disabled={uploading} aria-label="Volver">
            <X size={20} />
          </button>
        </div>

        <ImageCropCanvas
          imageSrc={imageSrc}
          onCropChange={(crop) => { cropRef.current = crop; }}
        />

        <div className="avc-actions">
          <button className="avc-btn avc-btn--secondary" onClick={onCancel} disabled={uploading}>
            Cancelar
          </button>
          <button className="avc-btn avc-btn--primary" onClick={handleConfirm} disabled={uploading}>
            {uploading
              ? <span className="avc-spinner" />
              : <><Check size={16} strokeWidth={2.5} /> Confirmar</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function AvatarCropper({ onCroppedFile, onClose, uploading }) {
  const [step, setStep]         = useState("pick");
  const [imageSrc, setImageSrc] = useState(null);

  const cameraInputRef  = useRef(null);
  const galleryInputRef = useRef(null);

  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImageSrc(reader.result); setStep("crop"); };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <input ref={cameraInputRef}  type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={(e) => loadFile(e.target.files[0])} />
      <input ref={galleryInputRef} type="file" accept="image/*"               style={{ display: "none" }} onChange={(e) => loadFile(e.target.files[0])} />

      {step === "pick" && (
        <SourcePicker
          onCamera ={() => cameraInputRef.current?.click()}
          onGallery={() => galleryInputRef.current?.click()}
          onClose={onClose}
        />
      )}

      {step === "crop" && imageSrc && (
        <CropStep
          imageSrc={imageSrc}
          onConfirm={onCroppedFile}
          onCancel={() => setStep("pick")}
          uploading={uploading}
        />
      )}
    </>
  );
}
