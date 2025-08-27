/*
  ToDo: Esto modulo debería ser capaz de darnos:
  * Nombre completo
  * Nombre de usuario
  * Foto de pefil (Con fallback incluido)
  * ...
  
  Considerar las vulnerabilidades de seguridad de usar este contexto en el frontend
*/
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);          // <- null, no {}
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 1) Escuchar Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUsuario(u ?? null);
    });
    return () => unsubAuth();
  }, []);

  // 2) Escuchar Perfil (en vivo) cuando hay usuario
  useEffect(() => {
    if (!usuario?.uid) {
      setPerfil(null);
      setLoading(false);        // no hay user, ya está
      return;
    }
    setLoading(true);           // hay user: esperamos primer snapshot
    const ref = doc(db, "usuarios", usuario.uid);
    const unsubPerfil = onSnapshot(
      ref,
      (snap) => {
        setPerfil(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (e) => {
        console.error("Error fetching perfil:", e);
        setPerfil(null);
        setLoading(false);
      }
    );
    return () => unsubPerfil();
  }, [usuario?.uid]);

  // Avatar: preview → perfil → auth
  const avatarUrl = preview || perfil?.fotoURL || usuario?.photoURL || null;

  const value = useMemo(
    () => ({
      usuario,
      perfil,
      loading,
      avatarUrl,
      preview,
      setPreview,
      uploading,
      setUploading,
    }),
    [usuario, perfil, loading, avatarUrl, preview, uploading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
