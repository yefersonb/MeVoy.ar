import React from "react";
import { useUser } from "../contexts/UserContext";
import logo from "../assets/logo/logo_dark.png";
import Avatar from "./ui/Avatar";

export default function Header({ isAdmin, onAvatarClick }) {
    const { setModoVista } = useUser() || {};

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
                        style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            height: "68%",
                            aspectRatio: "1 / 1",
                            borderRadius: "50%",
                            overflow: "hidden",
                            opacity: 0.85,
                        }}
                    >
                        <Avatar />
                    </button>
                </div>
            </div>
        </div>
    );
}
