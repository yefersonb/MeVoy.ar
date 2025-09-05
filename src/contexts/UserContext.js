// src/contexts/UserContext.jsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modoVista, setModoVista] = useState(null);

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Helper: combina claims + perfil.role
  const computeIsAdmin = (claimsAdmin, perfilData) =>
    Boolean(claimsAdmin) || perfilData?.role === "admin";

  // 1) Escuchar Auth y levantar claims iniciales
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUsuario(u ?? null);
      setPerfil(null);
      setIsAdmin(false);

      if (!u) {
        setLoading(false); // no hay usuario
        return;
      }

      // Levantar custom claims (admin)
      try {
        const token = await getIdTokenResult(u);
        setIsAdmin(Boolean(token?.claims?.admin));
      } catch (e) {
        console.error("getIdTokenResult error:", e);
        setIsAdmin(false);
      }
      // loading sigue en true hasta que llegue snapshot de perfil
    });
    return () => unsubAuth();
  }, []);

  // 2) Escuchar Perfil (en vivo) cuando hay usuario
  useEffect(() => {
    if (!usuario?.uid) return;

    setLoading(true);
    const ref = doc(db, "usuarios", usuario.uid);

    const unsubPerfil = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        setPerfil(data);

        // Refrescamos isAdmin combinando claim ya leída + fallback por perfil.role
        setIsAdmin((prevClaim) => computeIsAdmin(prevClaim, data));
        setLoading(false);
      },
      (e) => {
        console.error("Error fetching perfil:", e);
        setPerfil(null);
        // Mantener isAdmin solo por claims si perfil no carga
        setLoading(false);
      }
    );

    return () => unsubPerfil();
  }, [usuario?.uid]);

  // 3) Avatar: preview → perfil → auth
  const avatarUrl = preview || perfil?.fotoURL || usuario?.photoURL || null;

  // 4) Forzar refresh de claims (memoizado con useCallback)
  const refreshClaims = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return false;
    try {
      await u.getIdToken(true); // fuerza refresh
      const token = await getIdTokenResult(u);
      setIsAdmin(computeIsAdmin(token?.claims?.admin, perfil));
      return true;
    } catch (e) {
      console.error("refreshClaims error:", e);
      return false;
    }
  }, [perfil]);

  const value = useMemo(
    () => ({
      usuario,
      perfil,
      isAdmin,
      loading,
      avatarUrl,
      modoVista,
      setModoVista,
      preview,
      setPreview,
      uploading,
      setUploading,
      refreshClaims,
    }),
    [
      usuario,
      perfil,
      isAdmin,
      loading,
      avatarUrl,
      modoVista,
      preview,
      uploading,
      refreshClaims,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
