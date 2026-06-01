/**
 * useProfile — unified profile hook for all roles.
 *
 * Replaces: usePerfilData.js, and the inline Firestore logic
 * in TravelerProfilePage, TravelerProfile, and DriverProfile.
 *
 * Returns a live subscription (onSnapshot) so the profile stays in sync
 * across tabs/devices without manual reloading.
 *
 * All field names are in English. Firestore translation is handled
 * exclusively by profileSchema.js — no Spanish field names here.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { fromFirestore, toFirestore, profileCanReserve } from "../utils/profileSchema";

export function useProfile(usuario) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        if (!usuario?.uid) {
            setLoading(false);
            return;
        }

        const unsub = onSnapshot(
            doc(db, "usuarios", usuario.uid),
            (snap) => {
                if (snap.exists()) {
                    setProfile(fromFirestore(snap.data(), usuario));
                } else {
                    // First-time user: seed the doc with auth info
                    const seed = toFirestore({
                        name:     usuario.displayName || usuario.email || "",
                        photoUrl: usuario.photoURL || "",
                        role:     "viajero",
                    });
                    setDoc(doc(db, "usuarios", usuario.uid), {
                        ...seed,
                        fechaRegistro: serverTimestamp(),
                    }, { merge: true }).catch(console.error);
                    setProfile(fromFirestore({}, usuario));
                }
                setLoading(false);
            },
            (err) => {
                console.error("useProfile snapshot error:", err);
                setError("No se pudo cargar el perfil.");
                setLoading(false);
            }
        );

        return unsub;
    }, [usuario?.uid]);

    /**
     * Save a partial profile update. Accepts English-named fields only.
     * Automatically stamps updatedAt.
     * @param {Partial<Profile>} updates
     */
    const save = useCallback(async (updates) => {
        if (!usuario?.uid) throw new Error("No authenticated user");
        const firestoreData = {
            ...toFirestore(updates),
            actualizadoEn: serverTimestamp(),
        };
        await setDoc(doc(db, "usuarios", usuario.uid), firestoreData, { merge: true });
        // onSnapshot picks up the change automatically — no local state merge needed
    }, [usuario?.uid]);

    /** True when the passenger has the minimum fields required to book a trip. */
    const canReserve = useMemo(() => profileCanReserve(profile), [profile]);

    return { profile, loading, error, save, canReserve };
}
