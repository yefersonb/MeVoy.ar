import React from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useUser } from "../contexts/UserContext";

export default function Logout() {
  const { setUsuario } = useUser();

  const logout = async () => {
    try {
      await signOut(auth);
      setUsuario(null);
      localStorage.removeItem("rolSeleccionado"); // <-- limpiamos rol localStorage
    } catch (error) {
      console.error("Error cerrando sesión:", error);
      alert("No se pudo cerrar sesión");
    }
  };

  return <button onClick={logout}>Cerrar sesión</button>;
}

