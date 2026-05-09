// src/hooks/useTravelerProfileMinimal.js
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Checks whether the traveler has the minimum required profile fields.
 * Required Firestore fields: nombre, whatsapp, direccion (pending DB migration).
 */
export default function useTravelerProfileMinimal(user, isTraveler) {
  const [profileComplete, setProfileComplete] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const revalidate = useCallback(async () => {
    if (!user || !isTraveler) {
      setProfileComplete(false);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const ref = doc(db, "usuarios", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data() || {};
      const hasName = data.nombre || user.displayName || user.email;
      const hasWhatsapp = data.whatsapp || user.phoneNumber;
      const hasAddress = !!data.direccion;
      setProfileComplete(Boolean(hasName && hasWhatsapp && hasAddress));
    } else {
      // Create minimal doc and mark as incomplete
      await setDoc(ref, {
        rol: "viajero",
        nombre: user.displayName || user.email || "",
        fotoPerfil: user.photoURL || "",
        fechaRegistro: new Date(),
      }, { merge: true });
      setProfileComplete(false);
    }

    setLoadingProfile(false);
  }, [user, isTraveler]);

  useEffect(() => {
    revalidate();
  }, [revalidate]);

  return { profileComplete, loadingProfile, revalidate };
}
