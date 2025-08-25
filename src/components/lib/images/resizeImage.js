// src/components/lib/images/resizeImage.js

// Carga <img> desde un File/Blob
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Dibuja en canvas limitando el lado mayor a maxSize px
function drawToCanvas(img, maxSize) {
  const canvas = document.createElement("canvas");
  let { width, height } = img;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Redimensiona y comprime hasta quedar por debajo de targetBytes.
 * Convierte HEIC/HEIF/WebP/PNG a JPEG.
 *
 * @param {File} file
 * @param {number} maxSize        Lado mayor máximo (px)
 * @param {number} targetBytes    Tamaño objetivo (bytes), ej: 2*1024*1024
 * @returns {Promise<File>}       JPEG procesado
 */
export async function resizeImage(file, maxSize = 1600, targetBytes = 2 * 1024 * 1024) {
  const img = await loadImageFromFile(file);
  const canvas = drawToCanvas(img, maxSize);

  // Intentos de compresión: de mayor a menor calidad
  const qualities = [0.82, 0.75, 0.7, 0.6, 0.5];
  for (const q of qualities) {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
    if (blob && blob.size <= targetBytes) {
      return new File([blob], `${Date.now()}-selfie.jpg`, { type: "image/jpeg" });
    }
  }

  // Si no se alcanzó el target, devolvemos el último (más comprimido)
  const lastBlob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.5));
  return new File([lastBlob], `${Date.now()}-selfie.jpg`, { type: "image/jpeg" });
}
