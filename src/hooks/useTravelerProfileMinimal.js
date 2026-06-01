import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { fromFirestore, toFirestore, profileCanReserve } from "../utils/profileSchema";

/**
 * Lightweight profile check used by App.jsx to gate the loading screen.
 * Field names come from profileSchema — no Spanish field names here.
 */
export default function useTravelerProfileMinimal(user, isTraveler) {
    const [profileComplete, setProfileComplete] = useState(false);
    const [loadingProfile, setLoadingProfile]   = useState(true);

    const revalidate = useCallback(async () => {
        if (!user || !isTraveler) {
            setProfileComplete(false);
            setLoadingProfile(false);
            return;
        }

        setLoadingProfile(true);
        try {
            const snap = await getDoc(doc(db, "usuarios", user.uid));

            if (snap.exists()) {
                const profile = fromFirestore(snap.data(), user);
                setProfileComplete(profileCanReserve(profile));
            } else {
                // Seed a minimal doc for first-time users
                await setDoc(doc(db, "usuarios", user.uid), {
                    ...toFirestore({
                        name:     user.displayName || user.email || "",
                        photoUrl: user.photoURL || "",
                        role:     "viajero",
                    }),
                    fechaRegistro: serverTimestamp(),
                }, { merge: true });
                setProfileComplete(false);
            }
        } catch (e) {
            console.error("useTravelerProfileMinimal error:", e);
            setProfileComplete(false);
        } finally {
            setLoadingProfile(false);
        }
    }, [user, isTraveler]);

    useEffect(() => { revalidate(); }, [revalidate]);

    return { profileComplete, loadingProfile, revalidate };
}
