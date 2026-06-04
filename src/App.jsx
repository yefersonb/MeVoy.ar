import React, { useMemo, useState, useEffect } from "react";
import { User, CreditCard, List, LogOut, ChevronRight } from "react-feather";
import { CarIcon } from "./components/common/icons";
import { collection, doc, addDoc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./firebase";
import { useToast } from "./contexts/ToastContext";
import { useDrawer } from "./contexts/UserCardContext";
import TripRatingSheet from "./components/TripRatingSheet";
import { Star } from "react-feather";
import Avatar from "./components/ui/Avatar";

// Styles — tokens → base → markdown
import "./styles/classic.css";
import "./styles/cozyglow.css";
import "./styles/markdown.css";
// Shell
import Header from "./components/Header";
import BottomNav from "./components/layout/BottomNav";
import Copyright from "./components/common/Copyright";

// Auth screens
import Login from "./components/Login";
import Spinner from "./components/common/Spinner";

// Conductor
import DriverDashboard from "./components/DriverDashboard";
import VehiculosConductor from "./components/VehiculosConductor";

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
    const { usuario, perfil, isAdmin, loading } = useUser();
    const toast = useToast();
    const { openDrawer } = useDrawer();

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

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            toast.error("No se pudo cerrar la sesión. Intentá de nuevo.");
        }
    };

    const switchRole = async (newRol) => {
        if (newRol === rol || !usuario) return;
        try {
            await setDoc(doc(db, "usuarios", usuario.uid), { rol: newRol }, { merge: true });
        } catch (e) {
            toast.error("No se pudo cambiar el modo.");
        }
    };

    const reservarViaje = async (id) => {
        if (!usuario) return;
        try {
            const data = {
                viajanteUid:       usuario.uid,
                nombre:            usuario.displayName || usuario.email,
                whatsapp:          usuario.phoneNumber || "",
                fechaReserva:      new Date(),
                estadoReserva:     "pendiente",
                cantidadPasajeros: 1,
                creadoPor:         usuario.uid,
            };
            await addDoc(collection(db, "viajes", id, "reservas"), data);
            await updateDoc(doc(db, "viajes", id), { asientos: increment(-1) });
            const vSnap = await getDoc(doc(db, "viajes", id));
            if (vSnap.exists()) setBookedTrip({ id, ...vSnap.data() });
            toast.success("¡Reserva creada! El conductor confirmará pronto.");
        } catch (e) {
            console.error(e);
            toast.error("Hubo un problema al reservar. Intentá de nuevo.");
        }
    };

    // --- Loading / auth gates ---

    if (loading) {
        return (
            <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spinner />
            </div>
        );
    }

    if (!usuario) return <Login />;

    if (rol === "viajero" && loadingProfile) {
        return (
            <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spinner />
            </div>
        );
    }

    // --- Shared "Más" section — same for both roles ---

    const renderMas = () => (
        <div className="rack">
            {/* Mini profile card → opens profile editor */}
            <button className="mas-profile-card" onClick={() => handleSectionChange("perfil")}>
                <div className="mas-profile-card__avatar"><Avatar /></div>
                <div className="mas-profile-card__info">
                    <span className="mas-profile-card__name">
                        {perfil?.nombre || usuario?.displayName || "Mi perfil"}
                    </span>
                    <span className="mas-profile-card__hint">Editar perfil</span>
                </div>
                <ChevronRight size={18} className="mas-profile-card__chevron" />
            </button>

            {/* Role switcher — always visible so you can always switch back */}
            <div className="role-switcher">
                <button
                    className={`role-switcher__option${rol === "viajero" ? " role-switcher__option--active" : ""}`}
                    onClick={() => switchRole("viajero")}
                >
                    Viajar
                </button>
                <button
                    className={`role-switcher__option${rol === "conductor" ? " role-switcher__option--active" : ""}`}
                    onClick={() => switchRole("conductor")}
                >
                    Conducir
                </button>
            </div>

            {/* Role-specific + shared actions */}
            <div className="action-list">
                {rol === "viajero" ? (
                    <button className="action-list__item" onClick={() => handleSectionChange("viajes")}>
                        <List size={16} /> Mis reservas
                    </button>
                ) : (
                    <>
                        <button className="action-list__item" onClick={() => handleSectionChange("viajes")}>
                            <List size={16} /> Mis viajes
                        </button>
                        <button className="action-list__item" onClick={() => handleSectionChange("vehiculos")}>
                            <CarIcon size={16} /> Mis vehículos
                        </button>
                    </>
                )}
                {/* TODO: remove — test button for the rating drawer */}
                <button
                    className="action-list__item"
                    onClick={() => openDrawer(
                        <TripRatingSheet
                            trip={{ origen: "Córdoba", destino: "Buenos Aires" }}
                            onSubmit={async (data) => console.log("Rating submitted:", data)}
                        />,
                        "Calificar viaje"
                    )}
                >
                    <Star size={16} /> [Test] Calificar viaje
                </button>
                <button className="action-list__item">
                    <CreditCard size={16} /> Medios de Pago
                </button>
            </div>

            {/* Danger zone */}
            <div className="action-list">
                <button
                    className="action-list__item"
                    style={{ color: "var(--color-danger)" }}
                    onClick={handleLogout}
                >
                    <LogOut size={16} style={{ color: "var(--color-danger)" }} />
                    Cerrar sesión
                </button>
            </div>
        </div>
    );

    // --- Main content per role / section ---

    const renderContent = () => {
        if (activeSection === "perfil")                        return <TravelerProfilePage />;
        if (activeSection === "mas")                           return renderMas();
        if (activeSection === "vehiculos" && rol === "conductor") return <VehiculosConductor />;

        if (rol === "conductor") {
            return <DriverDashboard
                viajes={viajes}
                reservas={reservas}
                onGoToVehicles={() => handleSectionChange("vehiculos")}
            />;
        }

        switch (activeSection) {
            case "buscar":  return <TripSearch user={usuario} onBook={reservarViaje} />;
            case "viajes":  return <TravelerDashboard usuario={usuario} />;
            default:        return <TripSearch user={usuario} onBook={reservarViaje} />;
        }
    };

    return (
        <>
            <Header
                isAdmin={isAdmin}
                onAvatarClick={() => handleSectionChange("mas")}
            />
            <div className="app-container">
                {renderContent()}
            </div>
            <BottomNav
                rol={rol}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
            />
            <Copyright />
        </>
    );
}
