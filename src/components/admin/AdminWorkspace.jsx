import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut } from "react-feather";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useUser } from "../../contexts/UserContext";
import { IdentitySection, VehicleSection } from "./AdminVerificador";
import Avatar from "../ui/Avatar";

const SECTIONS = [
    { key: "identity", label: "Identidad" },
    { key: "vehicles", label: "Vehículos" },
];

export default function AdminWorkspace() {
    const { usuario } = useUser();
    const [section, setSection] = useState("identity");

    return (
        <div className="admin-workspace">
            {/* Top bar */}
            <header className="admin-workspace__topbar">
                <div className="admin-workspace__brand">
                    <span className="admin-workspace__brand-name">MeVoy</span>
                    <span className="admin-workspace__brand-badge">Admin</span>
                </div>

                <nav className="admin-workspace__nav">
                    {SECTIONS.map(({ key, label }) => (
                        <button
                            key={key}
                            className={`admin-tab${section === key ? " admin-tab--active" : ""}`}
                            onClick={() => setSection(key)}
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="admin-workspace__actions">
                    <Link to="/" className="button neutral admin-workspace__back">
                        <ArrowLeft size={14} /> App
                    </Link>
                    <div className="admin-workspace__avatar">
                        <Avatar />
                    </div>
                    <button
                        className="button neutral"
                        onClick={() => signOut(auth)}
                        aria-label="Cerrar sesión"
                        title={usuario?.email}
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="admin-workspace__content">
                {section === "identity" ? <IdentitySection /> : <VehicleSection />}
            </main>
        </div>
    );
}
