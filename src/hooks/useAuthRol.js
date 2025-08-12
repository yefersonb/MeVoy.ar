import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export function useAuthRol() {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      setLoading(true);
      setError(null);

      if (user) {
        try {
          const localRol = localStorage.getItem("rolSeleccionado");
          if (localRol) {
            setRol(localRol);
          } else {
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const rolBD = docSnap.data().rol;
              setRol(rolBD);
              localStorage.setItem("rolSeleccionado", rolBD);
            }
          }
        } catch (e) {
          setError("Error al obtener el rol del usuario.");
          setRol(null);
        }
      } else {
        setRol(null);
        localStorage.removeItem("rolSeleccionado");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      setUsuario(null);
      setRol(null);
      localStorage.removeItem("rolSeleccionado");
    } catch (e) {
      setError("Hubo un problema al cerrar sesión.");
    }
  };

  return { usuario, rol, setRol, loading, error, cerrarSesion };
}