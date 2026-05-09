// src/hooks/useTravelerProfileComplete.js
import { useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useTravelerProfileComplete(uid) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setLoading(true);
        const ref = doc(db, "usuarios", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          setProfile({});
        }
      } catch (e) {
        console.error("Error loading traveler profile:", e);
        setError("Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const canReserve = useMemo(() => {
    if (!profile) return false;
    return (
      profile.nombre?.trim()?.length > 0 &&
      profile.whatsapp?.trim()?.length > 0 &&
      profile.direccion?.trim()?.length > 0
    );
  }, [profile]);

  return { profile, loading, error, canReserve };
}
