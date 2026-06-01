/**
 * profileSchema.js — single source of truth for Firestore field name mapping.
 *
 * CURRENT STATE: Firestore uses Spanish field names (legacy).
 * CLEAN STATE:   English field names everywhere.
 *
 * All reads and writes go through fromFirestore() / toFirestore().
 * When the DB migration runs, update ONLY the values in FIELD_MAP
 * (make them match the keys) and remove this comment. Nothing else changes.
 *
 * Fields already in English are kept as-is and don't need mapping.
 * Fields with ⚠️ have inconsistent names across documents — noted below.
 */

// Maps clean English name → current Firestore (Spanish) field name.
export const FIELD_MAP = {
    name:            "nombre",
    address:         "direccion",
    bio:             "descripcion",
    profileVisible:  "perfilVisible",
    role:            "rol",
    photoUrl:        "fotoURL",       // ⚠️ some docs use "fotoPerfil" — see note below
    birthDate:       "fechaNacimiento",
    createdAt:       "fechaRegistro",
    updatedAt:       "actualizadoEn",
    // Driver-specific stats (top-level on doc, candidate for subcollection)
    experienceLevel: "nivelExperiencia",
    responseRate:    "tasaRespuesta",
    tripsCompleted:  "viajesCompletados",
    tripsPublished:  "viajesPublicados",
    lastTrip:        "ultimoViaje",
    ratings:         "valoraciones",
    // Already English — listed for completeness, values intentionally match keys:
    whatsapp:        "whatsapp",
    email:           "email",
};

// ⚠️  photoUrl inconsistency:
//   - Most code writes "fotoURL"
//   - useTravelerProfileMinimal writes "fotoPerfil" on first-time doc creation
//   - After DB migration, standardize on "photoUrl" and remove this note.

/**
 * Convert a raw Firestore document to a clean English-named profile object.
 * @param {object} data      Raw Firestore doc data (may be empty {})
 * @param {object} authUser  Firebase Auth user (used as fallback for name/photo)
 */
export function fromFirestore(data = {}, authUser = null) {
    return {
        name:            data.nombre           || authUser?.displayName || "",
        email:           data.email            || authUser?.email        || "",
        photoUrl:        data.fotoURL          || data.fotoPerfil        || authUser?.photoURL || "",
        whatsapp:        data.whatsapp         || authUser?.phoneNumber  || "",
        address:         data.direccion        || "",
        bio:             data.descripcion      || "",
        profileVisible:  data.perfilVisible    ?? true,
        role:            data.rol              || "viajero",
        birthDate:       data.fechaNacimiento  ?? null,
        createdAt:       data.fechaRegistro    ?? null,
        updatedAt:       data.actualizadoEn    ?? null,
        // Driver extras (optional — only present on conductor docs)
        experienceLevel: data.nivelExperiencia ?? null,
        responseRate:    data.tasaRespuesta    ?? null,
        tripsCompleted:  data.viajesCompletados ?? null,
        tripsPublished:  data.viajesPublicados  ?? null,
        ratings:         data.valoraciones     ?? null,
    };
}

/**
 * Convert a partial English-named profile object to Firestore write format.
 * Only includes fields that are explicitly present in the input (safe for merge).
 * @param {object} profile  Partial profile with English field names
 */
export function toFirestore(profile) {
    const out = {};
    if ("name"            in profile) out.nombre           = profile.name;
    if ("address"         in profile) out.direccion        = profile.address;
    if ("bio"             in profile) out.descripcion      = profile.bio;
    if ("profileVisible"  in profile) out.perfilVisible    = profile.profileVisible;
    if ("role"            in profile) out.rol              = profile.role;
    if ("photoUrl"        in profile) out.fotoURL          = profile.photoUrl;
    if ("birthDate"       in profile) out.fechaNacimiento  = profile.birthDate;
    if ("updatedAt"       in profile) out.actualizadoEn    = profile.updatedAt;
    if ("whatsapp"        in profile) out.whatsapp         = profile.whatsapp;
    if ("email"           in profile) out.email            = profile.email;
    if ("experienceLevel" in profile) out.nivelExperiencia = profile.experienceLevel;
    if ("responseRate"    in profile) out.tasaRespuesta    = profile.responseRate;
    if ("tripsCompleted"  in profile) out.viajesCompletados = profile.tripsCompleted;
    if ("tripsPublished"  in profile) out.viajesPublicados  = profile.tripsPublished;
    if ("ratings"         in profile) out.valoraciones     = profile.ratings;
    return out;
}

/** Minimum fields required for a passenger to make a reservation. */
export function profileCanReserve(profile) {
    return (
        profile?.name?.trim().length > 0 &&
        profile?.whatsapp?.trim().length > 0 &&
        profile?.address?.trim().length > 0
    );
}
