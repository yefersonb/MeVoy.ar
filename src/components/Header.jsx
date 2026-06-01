import React from "react";
import { useUser } from "../contexts/UserContext";
import logo from "../assets/logo/logo_dark.png";
import Avatar from "./ui/Avatar";

export default function Header({ isAdmin, onAvatarClick }) {
    const { setModoVista, perfil } = useUser() || {};
    const rol = perfil?.rol || "viajero";
    const rolLabel = rol === "conductor" ? "Conductor" : "Pasajero";

    return (
        <div className="header-container">
            <div className="header">
                <div className="module">
                    <img
                        src={logo}
                        alt="MeVoy"
                        style={{ height: "52%", opacity: 0.8 }}
                    />
                </div>

                <div className="module">
                    {isAdmin && (
                        <button
                            type="button"
                            className="button neutral"
                            style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                            onClick={() => setModoVista?.("admin")}
                        >
                            Admin
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onAvatarClick ?? (() => { window.location.hash = "perfil"; })}
                        aria-label="Mi perfil"
                        className="header-profile-btn"
                    >
                        <span className="header-role-label">{rolLabel}</span>
                        <div className="header-avatar">
                            <Avatar />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
