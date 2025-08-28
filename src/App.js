import React, { useState, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// UI Components
import CozySpinner from "./components/cozyglow/components/Spinners/CozySpinner/CozySpinner";

// Styles
import { ThemeProvider } from "./contexts/ThemeContext";
import "./styles/cozyglow/cozyglow.css";
import "./styles/cozyglow/color_themes/classic.css";
import "./styles/markdown.css";
import "./App.css";

// UI
import Copyright from "./components/common/Copyright";
import Login from "./components/Login";
import Header from "./components/Header";
import AdminVerificador from "./components/admin/AdminVerificador";

// Dashboards
import ConductorDashboard from "./components/ConductorDashboard";
import ViajeroDashboard from "./components/ViajeroDashboard";

// Hooks
import useConductorData from "./hooks/useConductorData";
import usePerfilViajeroMinimo from "./hooks/usePerfilViajeroMinimo";
import PageMain from "./pages/Main";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [rol, setRol] = useState(null);
  const [viajeReservado, setViajeReservado] = useState(null);

  // Perfil mínimo del viajero
  const { perfilCompleto, loadingPerfil } = usePerfilViajeroMinimo(
    usuario,
    rol === "viajero"
  );

  // Datos del conductor (suscripción en vivo)
  const { viajes, reservas } = useConductorData(usuario, rol === "conductor");

  // Auth + rol inicial (siempre prioriza Firestore)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "usuarios", user.uid));
          if (snap.exists()) {
            const rolDb = snap.data().rol || "viajero";
            setRol(rolDb);
            localStorage.setItem("rolSeleccionado", rolDb); // opcional
          } else {
            await setDoc(doc(db, "usuarios", user.uid), { rol: "viajero" }, { merge: true });
            setRol("viajero");
            localStorage.setItem("rolSeleccionado", "viajero");
          }
        } catch (err) {
          console.error("Error leyendo rol:", err);
          setRol("viajero");
        }
      } else {
        setRol(null);
        localStorage.removeItem("rolSeleccionado");
      }
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  // Toggle de rol (Header)
  const handleToggleRol = async () => {
    if (!usuario) return;
    const nuevoRol = rol === "viajero" ? "conductor" : "viajero";
    try {
      await setDoc(doc(db, "usuarios", usuario.uid), { rol: nuevoRol }, { merge: true });
      localStorage.setItem("rolSeleccionado", nuevoRol);
      setRol(nuevoRol);
    } catch (error) {
      console.error("Error al cambiar el rol:", error);
    }
  };

  // Reservar viaje (modo viajero)
  const reservarViaje = async (id) => {
    try {
      const data = {
        uid: usuario.uid,
        nombre: usuario.displayName || usuario.email,
        whatsapp: usuario.phoneNumber || "",
        fechaReserva: new Date(),
      };
      await addDoc(collection(db, "viajes", id, "reservas"), data);
      await updateDoc(doc(db, "viajes", id), { asientos: increment(-1) });

      const vSnap = await getDoc(doc(db, "viajes", id));
      if (vSnap.exists()) setViajeReservado({ id, ...vSnap.data() });

      alert("¡Reserva exitosa! Ahora podés pagar el viaje.");
    } catch (e) {
      console.error(e);
      alert("Hubo un problema al reservar");
    }
  };

  // Loaders / login
  if (loadingAuth) {
    return (
      <ThemeProvider>
        <div style={{height: "90vh", display: "flex", justifyContent: "center", alignItems: "center"}}>
          <CozySpinner />
        </div>
      </ThemeProvider>
    );
  }

  if (!usuario) {
    return (
      <ThemeProvider>
        <Login />
      </ThemeProvider>
    );
  }

  if (rol === "viajero" && loadingPerfil) {
    return (
      <ThemeProvider>
        <CozySpinner />
      </ThemeProvider>
    );
  }

  // App
  return (
    <ThemeProvider>
      <Header rol={rol} onToggleRol={handleToggleRol} />
      <div className="app-container">

        <PageMain rol={rol} />

        {rol === "conductor" ? (
          <ConductorDashboard viajes={viajes} reservas={reservas} />
        ) : rol === "viajero" ? (
          <ViajeroDashboard
            usuario={usuario}
            viajes={[]} // tu flujo original
            perfilCompleto={perfilCompleto}
            viajeReservado={viajeReservado}
            onReservar={reservarViaje}
          />
        ) : rol === "admin" ? (
          <AdminVerificador />
        ) : (
          <p>No autorizado</p>
        )}
      </div>
      <Copyright />
    </ThemeProvider>
  );
}
