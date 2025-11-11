// src/App.jsx
import React, { useMemo, useState } from "react";
import { collection, doc, addDoc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

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
import CozyBadge from "./components/ui/CozyBadge"

// Dashboards
import ConductorDashboard from "./components/ConductorDashboard";
import ViajeroDashboard from "./components/ViajeroDashboard";

// Hooks
import useConductorData from "./hooks/useConductorData";
import usePerfilViajeroMinimo from "./hooks/usePerfilViajeroMinimo";
import PageMain from "./pages/Main";

// Context
import { useUser } from "./contexts/UserContext";

export default function App() {
    const { usuario, perfil, isAdmin, loading, modoVista } = useUser();

    // Rol efectivo: si el perfil tiene rol lo usamos, si no 'viajero'
    // Nota: el admin real lo determina isAdmin (claims/seguridad). El "rol" en perfil es para UX.
    const rol = useMemo(() => perfil?.rol || "viajero", [perfil?.rol]);

    const [viajeReservado, setViajeReservado] = useState(null);

    // Perfil mínimo del viajero
    const { perfilCompleto, loadingPerfil } = usePerfilViajeroMinimo(usuario, rol === "viajero");

    // Datos del conductor (suscripción en vivo)
    const { viajes, reservas } = useConductorData(usuario, rol === "conductor");

    // Toggle de rol (Header) — alterna viajero/conductor SIN tocar admin
    const handleToggleRol = async () => {
        if (!usuario) return;
        const nuevoRol = rol === "viajero" ? "conductor" : "viajero";
        try {
            await setDoc(doc(db, "usuarios", usuario.uid), { rol: nuevoRol }, { merge: true });
        } catch (error) {
            console.error("Error al cambiar el rol:", error);
        }
    };

    // Reservar viaje (modo viajero)
    const reservarViaje = async (id) => {
        if (!usuario) return;
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
    if (loading) {
        return (
            <ThemeProvider>
                <div style={{ height: "90vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
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

    // App (finally)
    return (
        <ThemeProvider>
            <Header
                rol={rol}
                onToggleRol={handleToggleRol}
                isAdmin={isAdmin}
            />
            <div className="app-container">
                {/* <PageMain rol={rol} /> No se usea por ahora... está causando ruido. Buscar viajes no pertenece acá */}
                {
                    isAdmin && modoVista === "admin" ? (
                        // Admin real (claims) solo cuando el usuario ELIGE modo admin
                        <AdminVerificador />
                    )
                    : rol === "conductor" ? (
                        <ConductorDashboard viajes={viajes} reservas={reservas} />
                    )
                    : /* rol === "viajero" */ (                        
                        <ViajeroDashboard
                            usuario={usuario}
                            viajes={[]}
                            perfilCompleto={perfilCompleto}
                            viajeReservado={viajeReservado}
                            onReservar={reservarViaje}
                        />
                    )
                }
            </div>

            <Copyright />
        </ThemeProvider>
    );
}
