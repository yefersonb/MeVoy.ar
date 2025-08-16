import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);

      if (user) {
        try {
          const perfilRef = doc(db, "usuarios", user.uid);
          const snap = await getDoc(perfilRef);
          setPerfil(snap.exists() ? snap.data() : {});
        } catch (e) {
          console.error("Error fetching perfil:", e);
          setPerfil({});
        }
      } else {
        setPerfil({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Avatar logic centralised: preview → perfil → auth user
  const avatarUrl = preview || perfil?.fotoURL || usuario?.photoURL || null;

  return (
    <UserContext.Provider
      value={{
        usuario,
        perfil,
        loading,
        avatarUrl,
        preview,
        setPreview,
        uploading,
        setUploading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
