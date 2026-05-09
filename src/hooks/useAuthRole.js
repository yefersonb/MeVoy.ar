// src/hooks/useAuthRole.js
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export function useAuthRole() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        try {
          const savedRole = localStorage.getItem("rolSeleccionado");
          if (savedRole) {
            setRole(savedRole);
          } else {
            const docRef = doc(db, "usuarios", firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const dbRole = docSnap.data().rol;
              setRole(dbRole);
              localStorage.setItem("rolSeleccionado", dbRole);
            }
          }
        } catch (e) {
          setError("Error fetching user role.");
          setRole(null);
        }
      } else {
        setRole(null);
        localStorage.removeItem("rolSeleccionado");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      localStorage.removeItem("rolSeleccionado");
    } catch (e) {
      setError("Error signing out.");
    }
  };

  return { user, role, setRole, loading, error, logout };
}