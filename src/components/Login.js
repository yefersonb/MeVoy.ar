import React, { useState } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useUser } from "../contexts/UserContext";
import logo from "../assets/logo/logotype_light.png"; // Logo image

// UI Stuff
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import GLoginButton from "./google/GLoginButton";

export default function Login() {
  const { usuario, setUsuario } = useUser();
  const { isDark } = useTheme();
  const [whatsapp, setWhatsapp] = useState("");
  const [pidiendoWhatsapp, setPidiendoWhatsapp] = useState(false);
  const [userTemp, setUserTemp] = useState(null);

  const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();

    // 1) SOLO autenticación (si falla acá, sí es "error de login")
    let user;
    try {
      const result = await signInWithPopup(auth, provider);
      user = result.user;
    } catch (error) {
      console.error("Error REAL de login:", error);
      // Mensajes más claros para casos típicos
      const code = error?.code || "";
      let msg = "No se pudo iniciar sesión.";
      if (code === "auth/popup-closed-by-user") msg = "Cerraste la ventana de login.";
      else if (code === "auth/cancelled-popup-request") msg = "Se canceló la ventana anterior.";
      else if (code === "auth/popup-blocked") msg = "El navegador bloqueó el popup.";
      else if (code === "auth/network-request-failed") msg = "Problema de red. Revisá tu conexión.";
      alert(msg);
      return;
    }

    // 2) Perfil (si falla, NO decimos 'error en login'; pedimos WhatsApp y seguimos)
    try {
      const userRef = doc(db, "usuarios", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists() && snap.data().whatsapp) {
        setUsuario(user);
      } else {
        setUserTemp(user);
        setPidiendoWhatsapp(true);
      }
    } catch (error) {
      console.warn("Sesión iniciada, pero falló leer perfil:", error);
      setUserTemp(user);
      setPidiendoWhatsapp(true);
    }
  };

  const guardarWhatsapp = async () => {
    if (!userTemp) return;
    if (!whatsapp) {
      alert("Ingresá tu número de WhatsApp");
      return;
    }

    try {
      await setDoc(
        doc(db, "usuarios", userTemp.uid),
        {
          nombre: userTemp.displayName || "",
          whatsapp: whatsapp,
          email: userTemp.email || "",
        },
        { merge: true } // 🔹 no pisamos campos existentes
      );
      setUsuario(userTemp);
      setPidiendoWhatsapp(false);
    } catch (error) {
      console.error("Error guardando WhatsApp:", error);
      alert("Error guardando WhatsApp");
    }
  };

  // Si ya está logueado, no mostramos nada
  if (usuario) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", maxWidth: "300px", margin: "auto" }}>
      {/* (Logo dark/light futuro) */}
      <img src={logo} alt="[Logo de MeVoy]" style={{ marginTop: "3rem", marginBottom: "3rem", width: "70%" }} />
      <div style={{ margin: "2rem", opacity: 0.5 }}> Iniciá sesión </div>
      <GLoginButton onClick={loginConGoogle} />

      {pidiendoWhatsapp && (
        <div style={{ marginTop: 20 }}>
          <h4>Completá tu WhatsApp para continuar:</h4>
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Ej: 3756123456"
          />
          <button onClick={guardarWhatsapp}>Guardar</button>
        </div>
      )}
    </div>
  );
}
