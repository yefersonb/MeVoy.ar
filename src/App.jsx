import React, { useMemo, useState, useEffect } from "react";
import { User, CreditCard, List, LogOut } from "react-feather";
import { collection, doc, addDoc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Styles — tokens → base → markdown
import "./styles/classic.css";
import "./styles/cozyglow.css";
import "./styles/markdown.css";
import { ThemeProvider } from "./contexts/ThemeContext";

// Shell
import Header from "./components/Header";
import BottomNav from "./components/layout/BottomNav";
import Copyright from "./components/common/Copyright";

// Auth screens
import Login from "./components/Login";
import Spinner from "./components/common/Spinner";

// Admin
import AdminVerificador from "./components/admin/AdminVerificador";

// Conductor
import DriverDashboard from "./components/DriverDashboard";

// Viajero
import TravelerDashboard from "./components/TravelerDashboard";
import TravelerProfilePage from "./components/TravelerProfilePage";
import TripSearch from "./components/TripSearch";

// Hooks
import useConductorData from "./hooks/useConductorData";
import useTravelerProfileMinimal from "./hooks/useTravelerProfileMinimal";

// Context
import { useUser } from "./contexts/UserContext";

const DEFAULT_SECTION = { conductor: "viajes", viajero: "buscar" };

// Hash that DriverProfile reads for conductor bottom-nav sections
const CONDUCTOR_HASH = { viajes: "reservas", nuevo: "nuevo-viaje" };

export default function App() {
    const { usuario, perfil, isAdmin, loading, modoVista } = useUser();

    const rol = useMemo(() => perfil?.rol || "viajero", [perfil?.rol]);

    const [bookedTrip, setBookedTrip] = useState(null);
    const [activeSection, setActiveSection] = useState(DEFAULT_SECTION.viajero);

    const { profileComplete, loadingProfile } = useTravelerProfileMinimal(usuario, rol === "viajero");
    const { viajes, reservas } = useConductorData(usuario, rol === "conductor");

    // Reset active section whenever role resolves / changes
    useEffect(() => {
        const section = DEFAULT_SECTION[rol] ?? "buscar";
        setActiveSection(section);
        if (rol === "conductor") {
            window.location.hash = CONDUCTOR_HASH[section] ?? "";
        }
    }, [rol]);

    const handleSectionChange = (section) => {
        setActiveSection(section);
        if (rol === "conductor" && CONDUCTOR_HASH[section] !== undefined) {
            window.location.hash = CONDUCTOR_HASH[section];
        }
    };

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
            alert("¡Reserva exitosa!");
        } catch (e) {
            console.error(e);
            alert("Hubo un problema al reservar.");
        }
    };

    // --- Loading / auth gates ---

    if (loading) {
        return (
            <ThemeProvider>
                <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spinner />
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
                <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spinner />
                </div>
            </ThemeProvider>
        );
    }

    // --- Main content per role / section ---

    const renderContent = () => {
        if (isAdmin && modoVista === "admin") {
            return <AdminVerificador />;
        }

        if (activeSection === "perfil") return <TravelerProfilePage />;

        if (rol === "conductor") {
            if (activeSection === "mas") return (
                <div className="rack">
                    <div className="action-list">
                        <button className="action-list__item" onClick={() => handleSectionChange("perfil")}><User size={16} /> Mi Perfil</button>
                        <button className="action-list__item"><CreditCard size={16} /> Medios de Pago</button>
                    </div>
                </div>
            );
            // Bottom nav drives the hash; DriverDashboard responds to hash via useHashSection
            return <DriverDashboard viajes={viajes} reservas={reservas} />;
        }

        // viajero — bottom nav controls which section is shown
        switch (activeSection) {
            case "buscar":
                return <TripSearch user={usuario} onBook={reservarViaje} />;
            case "viajes":
                return (
                    <TravelerDashboard
                        usuario={usuario}
                        viajes={[]}
                        perfilCompleto={profileComplete}
                        viajeReservado={bookedTrip}
                        onReservar={reservarViaje}
                    />
                );
            case "mas":
                return (
                    <div className="rack">
                        <div className="action-list">
                            <button className="action-list__item" onClick={() => handleSectionChange("perfil")}><User size={16} /> Mi Perfil</button>
                            <button className="action-list__item"><CreditCard size={16} /> Medios de Pago</button>
                            <button className="action-list__item"><List size={16} /> Reservas</button>
                        </div>
                        <div className="action-list">
                            <button className="action-list__item" style={{color: "var(--color-danger)"}}><LogOut size={16} style={{color: "var(--color-danger)"}}/> Cerrar sesión</button>
                        </div>
                    </div>
                );
            default:
                return <TripSearch user={usuario} onBook={reservarViaje} />;
        }
    };

    return (
        <ThemeProvider>
            <Header isAdmin={isAdmin} />
            <div className="app-container">
                {renderContent()}
            </div>
            <BottomNav
                rol={isAdmin && modoVista === "admin" ? null : rol}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
            />
            <Copyright />
        </ThemeProvider>
    );
}
