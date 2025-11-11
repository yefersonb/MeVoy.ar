// src/components/Header.js
import React from "react";
import { useUser } from "../contexts/UserContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// UI
import logo from "../assets/logo/logo_dark.png";
import Avatar from "./ui/Avatar";
import { Caret } from "./cozyglow/icons/Caret";

// Menú desprendido
import UserMenuPortal from "./menus/UserMenuPortal";

export default function Header({ rol = "viajero", onToggleRol, onLogout }) {
    const { usuario, perfil, isAdmin, setModoVista } = useUser() || {};

    const nombre =
        perfil?.nombre ||
        usuario?.displayName ||
        (usuario?.email ? usuario.email.split("@")[0] : "Invitado");

    const etiquetaRol = rol === "viajero" ? "Viajante" : "Conductor";
    const proximoRol = rol === "viajero" ? "conductor" : "viajero";

    const [menuAbierto, setMenuAbierto] = React.useState(false);
    const btnRef = React.useRef(null);

    function toggleMenu() {
        setMenuAbierto((v) => !v);
    }

    // Cambiar rol y salir de modo admin (si estaba activo)
    const handleToggleRol = async () => {
        try {
            setModoVista?.(null);
            await onToggleRol?.();
        } catch { }
    };

    // Ir a una sección por ID (scroll suave). Si no existe, setea hash igualmente.
    const goToAnchor = (id) => {
        setModoVista?.(null); // salimos de modo admin al ir a secciones normales
        setMenuAbierto(false);
        const sel = `#${id}`;
        const el = document.querySelector(sel);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            window.location.hash = sel;
        }
    };

    // Entrar al panel admin (sin cambiar rol)
    const goAdmin = () => {
        setModoVista?.("admin");
        setMenuAbierto(false);
        // opcional: window.location.hash = "#admin";
    };

    async function doLogout() {
        try {
            if (onLogout) await onLogout();
            else await signOut(auth);
        } catch (e) {
            console.error(e);
            alert("No se pudo cerrar sesión");
        } finally {
            setMenuAbierto(false);
        }
    }

    // Ítems del menú con href único + onClick (para evitar el warning de onClick boolean)
    const MENU_ITEMS = [
        ...(isAdmin
            ? [{ label: "Panel Admin", href: "#admin", onClick: goAdmin }]
            : []),
        { label: "Perfil", href: "#perfil", onClick: () => goToAnchor("perfil") },
        { label: "Verificación", href: "#verificacion", onClick: () => goToAnchor("verificacion") },
        { label: "Reservas", href: "#reservas", onClick: () => goToAnchor("reservas") },
        { label: "Vehículos", href: "#mis-vehiculos", onClick: () => goToAnchor("mis-vehiculos") },
        { label: "Envíos", href: "#envios", onClick: () => goToAnchor("envios") },
        { label: "Nuevo viaje", href: "#nuevo-viaje", onClick: () => goToAnchor("nuevo-viaje") },
    ];

    return (
        <div className="header-container">
            <div className="header">
                {/* IZQUIERDA: logo + saludo */}
                <div className="module">
                    <img src={logo} alt="MeVoy Logo" style={{ height: "70%" }} />
                    <div>
                        <span id="header-hola">Hola, </span>
                        {nombre}
                        <span id="header-hola-exclamation">!</span>
                    </div>
                </div>

                {/* DERECHA: avatar/menu + rol + (opcional) salir */}
                <div className="module">
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.8rem",
                            height: "100%",
                            padding: 0,
                        }}
                    >
                        {/* Avatar + caret */}
                        <button
                            id="user-menu-button"
                            ref={btnRef}
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={menuAbierto}
                            aria-controls={menuAbierto ? "user-menu" : undefined}
                            onClick={toggleMenu}
                            title="Menú de usuario"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.1rem",
                                padding: "0.1rem",
                                borderRadius: 999,
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
                                cursor: "pointer",
                                height: "100%",
                            }}
                        >
                            <div style={{ height: "100%" }}>
                                <Avatar />
                            </div>
                            <Caret size="30px" direction={menuAbierto ? "up" : "down"} />
                        </button>

                        {/* Cambiar rol (viajero/conductor) */}
                        <button
                            type="button"
                            className="button row neutral"
                            onClick={handleToggleRol}
                            title={`Cambiar a ${proximoRol}`}
                            style={{ cursor: "pointer" }}
                        >
                            <div>{etiquetaRol}</div>
                        </button>

                        {/* Botón Admin SOLO si es admin */}
                        {isAdmin && (
                            <button
                                type="button"
                                className="button row neutral"
                                onClick={goAdmin}
                                title="Panel Admin"
                                style={{ cursor: "pointer" }}
                            >
                                <div>Admin</div>
                            </button>
                        )}

                        {/* (Opcional) Salir rápido */}
                        {onLogout && (
                            <button
                                type="button"
                                className="button borderless row danger"
                                onClick={onLogout}
                                title="Cerrar sesión"
                                style={{ cursor: "pointer" }}
                            >
                                Salir
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Menú desprendido por portal */}
            <UserMenuPortal
                open={menuAbierto}
                anchorRef={btnRef}
                onClose={() => setMenuAbierto(false)}
                onLogout={doLogout}
                items={MENU_ITEMS}
            />
        </div>
    );
}
