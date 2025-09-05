//src/hooks/usePerfilViajeroMinimo.js
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Verifica si el viajero tiene perfil mínimo completo.
 * Campos mínimos: nombre, whatsapp, direccion.
 */
export default function usePerfilViajeroMinimo(usuario, isViajero) {
  const [perfilCompleto, setPerfilCompleto] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const revalidate = useCallback(async () => {
    if (!usuario || !isViajero) {
      setPerfilCompleto(false);
      setLoadingPerfil(false);
      return;
    }

    setLoadingPerfil(true);
    const ref = doc(db, "usuarios", usuario.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data() || {};
      const tieneNombre = data.nombre || usuario.displayName || usuario.email;
      const tieneWhatsapp = data.whatsapp || usuario.phoneNumber;
      const tieneDireccion = !!data.direccion;
      setPerfilCompleto(Boolean(tieneNombre && tieneWhatsapp && tieneDireccion));
    } else {
      // Creamos doc mínimo y marcamos incompleto
      await setDoc(ref, {
        rol: "viajero",
        nombre: usuario.displayName || usuario.email || "",
        fotoPerfil: usuario.photoURL || "",
        fechaRegistro: new Date(),
      }, { merge: true });
      setPerfilCompleto(false);
    }

    setLoadingPerfil(false);
  }, [usuario, isViajero]);

  useEffect(() => {
    revalidate();
  }, [revalidate]);

  return { perfilCompleto, loadingPerfil, revalidate };
}
