import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "react-feather";
import { useUser } from "../contexts/UserContext";
import { useNotifications } from "../contexts/NotificationContext";
import Avatar from "./ui/Avatar";
import logo from "../assets/logo/logo_dark.png";

export default function Header({ isAdmin, onAvatarClick }) {
    const { perfil } = useUser() || {};
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();

    const rol      = perfil?.rol || "viajero";
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
                        <Link
                            to="/admin"
                            className="button neutral"
                            style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                        >
                            Admin
                        </Link>
                    )}

                    {/* Role chip */}
                    <span className="header-role-chip">{rolLabel}</span>

                    {/* Notification bell */}
                    <button
                        type="button"
                        className="header-bell"
                        onClick={() => navigate("/notifications")}
                        aria-label={unreadCount > 0 ? `${unreadCount} notificaciones` : "Notificaciones"}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="header-bell__dot" />}
                    </button>

                    {/* Profile button — always goes to Más */}
                    <button
                        type="button"
                        onClick={onAvatarClick ?? (() => { window.location.hash = "perfil"; })}
                        aria-label="Mi perfil"
                        className="header-profile-btn"
                    >
                        <div className="header-avatar">
                            <Avatar />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
