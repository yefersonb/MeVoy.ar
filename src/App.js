// src/App.js — App limpia (sin rutas nuevas)
import React, { useState, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import { ThemeProvider } from "./contexts/ThemeContext";

// ✅ CozyGlow
import CozySpinner from "./components/cozyglow/components/Spinners/CozySpinner/CozySpinner";
import "./styles/cozyglow/cozyglow.css";
import "./styles/cozyglow/color_themes/mvclassic.css";
import "./App.css"; // dejalo último

// UI
import Login from "./components/Login";
import Header from "./components/Header";
import VerificacionVehiculosAdmin from "./components/vehicleVerification/VerificacionVehiculosAdmin";

// Dashboards
import ConductorDashboard from "./components/ConductorDashboard";
import ViajeroDashboard from "./components/ViajeroDashboard";

// Hooks
import useConductorData from "./hooks/useConductorData";
import usePerfilViajeroMinimo from "./hooks/usePerfilViajeroMinimo";

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

  // Auth + rol inicial
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        const stored = localStorage.getItem("rolSeleccionado");
        if (stored) {
          setRol(stored);
        } else {
          const snap = await getDoc(doc(db, "usuarios", user.uid));
          if (snap.exists()) {
            const rolDb = snap.data().rol || "viajero";
            setRol(rolDb);
            localStorage.setItem("rolSeleccionado", rolDb);
          } else {
            await setDoc(doc(db, "usuarios", user.uid), { rol: "viajero" }, { merge: true });
            setRol("viajero");
            localStorage.setItem("rolSeleccionado", "viajero");
          }
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
        <CozySpinner />
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

  // App (layout anterior)
  return (
    <ThemeProvider>
      <div className="app-container">
        <Header rol={rol} onToggleRol={handleToggleRol} />

        {rol === "conductor" ? (
          <ConductorDashboard viajes={viajes} reservas={reservas} />
        ) : rol === "viajero" ? (
          <ViajeroDashboard
            usuario={usuario}
            viajes={[]}                // tu flujo original
            perfilCompleto={perfilCompleto}
            viajeReservado={viajeReservado}
            onReservar={reservarViaje}
          />
        ) : (
          <VerificacionVehiculosAdmin />
        )}
      </div>
    </ThemeProvider>
  );
}
