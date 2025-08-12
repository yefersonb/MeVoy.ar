import React, { useState } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useUser } from "../contexts/UserContext";
import logo from "../assets/logo/logotype_light.png"; // Logo image

// UI Stuff
import { ThemeProvider, useTheme } from "../contexts/ThemeContext"; // This helps us detect the current theme
import GLoginButton from "./google/GLoginButton";

export default function Login() {
  const { usuario, setUsuario } = useUser();
  const { isDark } = useTheme(); // <-- use the context
  const [whatsapp, setWhatsapp] = useState("");
  const [pidiendoWhatsapp, setPidiendoWhatsapp] = useState(false);
  const [userTemp, setUserTemp] = useState(null);

  const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Buscamos si el usuario ya tiene documento
      const userRef = doc(db, "usuarios", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists() && snap.data().whatsapp) {
        setUsuario(user);
      } else {
        setUserTemp(user);
        setPidiendoWhatsapp(true);
      }
    } catch (error) {
      console.error("Error en login:", error);
      alert("Error al iniciar sesión");
    }
  };

  const guardarWhatsapp = async () => {
    if (!userTemp) return;
    if (!whatsapp) {
      alert("Ingresá tu número de WhatsApp");
      return;
    }
    try {
      await setDoc(doc(db, "usuarios", userTemp.uid), {
        nombre: userTemp.displayName,
        whatsapp: whatsapp,
        email: userTemp.email,
      });
      setUsuario(userTemp);
      setPidiendoWhatsapp(false);
    } catch (error) {
      alert("Error guardando WhatsApp");
      console.error(error);
    }
  };

  // This shouldn't be neccessary... this component is only called if the user is not logged in by the App.js logic
  if (usuario) return null;

  /*
    This section renders the login interface.
    If the user needs to log in the Login.js will return this rendering agent to React
    ToDo:
    * The logo is now a plain image, and its hardcoded to be in dark mode.
    * Consider using a CSS variable or prop to handle dark/light themes.
  */
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", maxWidth: "300px", margin: "auto" }}>
      {/* Disabled until dark mode is supported again
      <img
        src={isDark
          ? "/assets/logo_mevoy_nobg_dark.png"
          : "/assets/logo_mevoy_nobg.png"}
        alt="[Logo de MeVoy]"
        style={{ marginTop: "5rem", width: "100%" }}
      /> */}
      <img
        src={logo}
        alt="[Logo de MeVoy]"
        style={{ marginTop: "6rem", marginBottom: "3rem", width: "70%" }}
      />
      <div style={{ margin: "2rem", opacity: 0.5 }}> Iniciá sesión </div>      
      <GLoginButton onClick={loginConGoogle} />

      {
        /*
          ToDo:
            * Enhance the look of this Input element
            * Variable names are... not great.
            * This should probably be moved to a separate component
            * GPT: Consider using a form validation library like Formik or React Hook Form
        */
      }
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