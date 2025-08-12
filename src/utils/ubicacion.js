// src/utils/ubicacion.js

/**
 * Toma una dirección completa y acorta “Misiones” a “Mnes” y “Argentina” a “AR”.
 * @param {string} ubic - Dirección completa.
 * @returns {string} Dirección abreviada.
 */
export function abreviarUbicacion(ubic) {
  if (!ubic) return ubic;
  return ubic
    .replace(/Misiones(?: Province)?/g, "Mnes")
    .replace(/Argentina/g, "AR");
}