// src/hooks/usePerfilViajeroCompleto.js
import { useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function usePerfilViajeroCompleto(uid) {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setCargando(true);
        const ref = doc(db, "usuarios", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPerfil(snap.data());
        } else {
          setPerfil({});
        }
      } catch (e) {
        console.error("Error cargando perfil viajero:", e);
        setError("No se pudo cargar el perfil.");
      } finally {
        setCargando(false);
      }
    })();
  }, [uid]);

  const puedeReservar = useMemo(() => {
    if (!perfil) return false;
    return (
      perfil.nombre?.trim()?.length > 0 &&
      perfil.whatsapp?.trim()?.length > 0 &&
      perfil.direccion?.trim()?.length > 0
    );
  }, [perfil]);

  return { perfil, cargando, error, puedeReservar };
}
