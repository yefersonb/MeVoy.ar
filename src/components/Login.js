// src/components/Login.jsx
import { useState } from "react";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useUser } from "../contexts/UserContext";
import { useTheme } from "../contexts/ThemeContext"; // si tu ThemeContext existe
import logoLight from "../assets/logo/logotype_light.png";
// si tenés versión dark, descomentá y usala:
// import logoDark from "../assets/logo/logotype_dark.png";

import GLoginButton from "./google/GLoginButton";

export default function Login() {
  const { usuario } = useUser();           // 👈 NO usamos setUsuario: el contexto se actualiza solo
  const { isDark } = useTheme?.() || { isDark: false };

  const [whatsapp, setWhatsapp] = useState("");
  const [pidiendoWhatsapp, setPidiendoWhatsapp] = useState(false);
  const [userTemp, setUserTemp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const loginConGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);

    try {
      // 1) Intento con POPUP
      const result = await signInWithPopup(auth, googleProvider);
      await handlePostLogin(result.user);
    } catch (e) {
      const code = e?.code || "";
      // 2) Fallback a REDIRECT si el popup está bloqueado / cancelado
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // redirige; no seguimos
        } catch (e2) {
          console.error("Login redirect error:", e2);
          setMsg("No se pudo abrir el inicio de sesión.");
        }
      } else {
        console.error("Login error:", e);
        setMsg("Error al iniciar sesión.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePostLogin = async (user) => {
    // Chequear doc de perfil
    const userRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(userRef);

    const yaTieneWhatsapp = snap.exists() && !!snap.data()?.whatsapp;

    if (yaTieneWhatsapp) {
      // No hacemos nada: onAuthStateChanged en UserContext actualizará la UI
      setMsg("¡Bienvenido!");
      setPidiendoWhatsapp(false);
      setUserTemp(null);
      return;
    }

    // Pedimos WhatsApp
    setUserTemp(user);
    setPidiendoWhatsapp(true);
  };

  const guardarWhatsapp = async () => {
    if (!userTemp) return;
    const tel = whatsapp.trim();

    // Validación simple
    if (!tel) {
      setMsg("Ingresá tu número de WhatsApp");
      return;
    }
    // Opcional: validar formato (solo dígitos, 8-13 chars, etc.)
    // if (!/^\d{8,13}$/.test(tel)) { setMsg("Número inválido"); return; }

    try {
      const ref = doc(db, "usuarios", userTemp.uid);
      await setDoc(
        ref,
        {
          nombre: userTemp.displayName || "",
          email: userTemp.email || "",
          whatsapp: tel,
          fotoURL: userTemp.photoURL || "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true } // ← no pisamos otros campos si el doc ya existía
      );

      setMsg("¡Listo! Ya podés continuar.");
      setPidiendoWhatsapp(false);
      setUserTemp(null);
      // No llamamos setUsuario: el UserContext detecta la sesión y el onSnapshot del perfil se actualiza solo
    } catch (e) {
      console.error("Error guardando WhatsApp:", e);
      setMsg("Error guardando WhatsApp. Probá de nuevo.");
    }
  };

  // Si ya hay usuario logueado, no mostramos el login (evita “banner fantasma”)
  if (usuario) return null;

  return (
    <div style={{
      display: "grid",
      gap: 16,
      justifyItems: "center",
      padding: "2rem",
      maxWidth: 360,
      margin: "0 auto"
    }}>
      {/* Logo: si tenés versión dark, alterná con isDark */}
      <img
        src={/* isDark ? logoDark : */ logoLight}
        alt="[Logo de MeVoy]"
        style={{ marginTop: "2rem", marginBottom: "1rem", width: "70%", maxWidth: 280 }}
      />

      <div style={{ opacity: 0.7, marginBottom: 8 }}>Iniciá sesión</div>

      <GLoginButton onClick={loginConGoogle} disabled={busy} label={busy ? "Entrando..." : "Entrar con Google"} />

      {pidiendoWhatsapp && (
        <div style={{
          display: "grid",
          gap: 8,
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          marginTop: 12
        }}>
          <h4 style={{ margin: 0 }}>Completá tu WhatsApp para continuar</h4>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Ej: 3751679884"
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              outline: "none"
            }}
          />
          <button
            onClick={guardarWhatsapp}
            disabled={!whatsapp.trim()}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: whatsapp.trim() ? "#10b981" : "#9ca3af",
              color: "white",
              fontWeight: 600
            }}
          >
            Guardar
          </button>
        </div>
      )}

      {msg && <small style={{ opacity: 0.8 }}>{msg}</small>}
    </div>
  );
}
