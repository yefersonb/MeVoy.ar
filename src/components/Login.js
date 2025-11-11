// src/components/Login.jsx
import { useEffect, useState } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useUser } from "../contexts/UserContext";
import { useTheme } from "../contexts/ThemeContext";
import imgLogo from "../assets/logo/logotype_dark.png";
import GLoginButton from "./google/GLoginButton";

export default function Login() {
  const { usuario } = useUser(); // el contexto se actualiza solo por onAuthStateChanged
  const { isDark } = useTheme?.() || { isDark: false };

  const [whatsapp, setWhatsapp] = useState("");
  const [pidiendoWhatsapp, setPidiendoWhatsapp] = useState(false);
  const [userTemp, setUserTemp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // === Post-login para flujo REDIRECT ===
  useEffect(() => {
    // Procesa el resultado si venimos de signInWithRedirect
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          handlePostLogin(res.user);
        }
      })
      .catch((e) => {
        // si no hay redirect pendiente, Firebase tira error benigno; lo ignoramos salvo casos útiles
        const code = e?.code || "";
        if (code && code !== "auth/no-auth-event") {
          console.error("Redirect result error:", e);
          setMsg("No se pudo completar el inicio de sesión (redirect).");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginConGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);

    try {
      // Si el sitio está aislado (COOP/COEP), usá redirect para evitar warnings/popups bloqueados
      if (window.crossOriginIsolated) {
        await signInWithRedirect(auth, googleProvider);
        return; // redirige; no seguimos
      }

      // Intento con POPUP
      const result = await signInWithPopup(auth, googleProvider);
      await handlePostLogin(result.user);
    } catch (e) {
      const code = e?.code || "";
      // Fallback a REDIRECT si el popup está bloqueado/cancelado
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
    try {
      const userRef = doc(db, "usuarios", user.uid);
      const snap = await getDoc(userRef);
      const yaTieneWhatsapp = snap.exists() && !!snap.data()?.whatsapp;

      if (yaTieneWhatsapp) {
        setMsg("¡Bienvenido!");
        setPidiendoWhatsapp(false);
        setUserTemp(null);
        return;
      }

      // Pedimos WhatsApp
      setUserTemp(user);
      setPidiendoWhatsapp(true);
    } catch (e) {
      console.error("Error leyendo perfil:", e);
      setMsg("No se pudo leer tu perfil.");
    }
  };

  const guardarWhatsapp = async () => {
    if (!userTemp) return;
    const tel = whatsapp.trim();

    if (!tel) {
      setMsg("Ingresá tu número de WhatsApp");
      return;
    }

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
        { merge: true }
      );

      setMsg("¡Listo! Ya podés continuar.");
      setPidiendoWhatsapp(false);
      setUserTemp(null);
      // El UserContext detecta la sesión y actualizará el estado
    } catch (e) {
      console.error("Error guardando WhatsApp:", e);
      setMsg("Error guardando WhatsApp. Probá de nuevo.");
    }
  };

  // Si ya hay usuario logueado, no mostramos el login
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
      <img src={imgLogo} alt="[Logo de MeVoy]" style={{ marginTop: "4rem", marginBottom: "3rem", width: "70%", maxWidth: 280 }} />

      <div style={{ opacity: 0.7, marginBottom: 8 }}>Iniciá sesión</div>

      <GLoginButton
        onClick={loginConGoogle}
        disabled={busy}
        label={busy ? "Entrando..." : "Entrar con Google"}
      />

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

