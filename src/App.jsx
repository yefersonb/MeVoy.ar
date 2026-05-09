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
import DriverDashboard from "./components/DriverDashboard";
import TravelerDashboard from "./components/TravelerDashboard";

// Hooks
import useConductorData from "./hooks/useConductorData";
import useTravelerProfileMinimal from "./hooks/useTravelerProfileMinimal";
import PageMain from "./pages/Main";

// Context
import { useUser } from "./contexts/UserContext";

export default function App() {
    const { usuario, perfil, isAdmin, loading, modoVista } = useUser();

    // Effective role: use profile role if set, otherwise default to 'viajero'.
    // Note: real admin access is determined by isAdmin (claims). The "rol" in profile is UX-only.
    const rol = useMemo(() => perfil?.rol || "viajero", [perfil?.rol]);

    const [bookedTrip, setBookedTrip] = useState(null);

    const { profileComplete, loadingProfile } = useTravelerProfileMinimal(usuario, rol === "viajero");

    // Driver data (live subscription)
    const { viajes, reservas } = useConductorData(usuario, rol === "conductor");

    // Role toggle (Header) — switches between traveler/driver without touching admin
    const handleToggleRol = async () => {
        if (!usuario) return;
        const nuevoRol = rol === "viajero" ? "conductor" : "viajero";
        try {
            await setDoc(doc(db, "usuarios", usuario.uid), { rol: nuevoRol }, { merge: true });
        } catch (error) {
            console.error("Error changing role:", error);
        }
    };

    // Book trip (traveler mode)
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
            if (vSnap.exists()) setBookedTrip({ id, ...vSnap.data() });

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

    if (rol === "viajero" && loadingProfile) {
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
                {/* <PageMain rol={rol} /> Disabled for now — causing noise. Trip search doesn't belong here */}
                {
                    isAdmin && modoVista === "admin" ? (
                        // Real admin (claims) only when the user explicitly chooses admin mode
                        <AdminVerificador />
                    )
                    : rol === "conductor" ? (
                        <DriverDashboard viajes={viajes} reservas={reservas} />
                    )
                    : /* rol === "viajero" */ (                        
                        <TravelerDashboard
                            usuario={usuario}
                            viajes={[]}
                            perfilCompleto={profileComplete}
                            viajeReservado={bookedTrip}
                            onReservar={reservarViaje}
                        />
                    )
                }
            </div>

            <Copyright />
        </ThemeProvider>
    );
}
