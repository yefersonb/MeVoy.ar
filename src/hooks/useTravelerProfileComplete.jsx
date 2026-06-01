import { useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { fromFirestore, profileCanReserve } from "../utils/profileSchema";

/**
 * One-time profile fetch used by TripDetail to gate reservations.
 * Field names come from profileSchema — no Spanish field names here.
 */
export function useTravelerProfileComplete(uid) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        if (!uid) return;
        (async () => {
            try {
                setLoading(true);
                const snap = await getDoc(doc(db, "usuarios", uid));
                setProfile(fromFirestore(snap.exists() ? snap.data() : {}));
            } catch (e) {
                console.error("useTravelerProfileComplete error:", e);
                setError("No se pudo verificar el perfil.");
            } finally {
                setLoading(false);
            }
        })();
    }, [uid]);

    const canReserve = useMemo(() => profileCanReserve(profile), [profile]);

    return { profile, loading, error, canReserve };
}
