// src/components/Header.js
import React from "react";
import { useUser } from "../contexts/UserContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// UI
import logo from "../assets/logo/logo_light.png";
import Avatar from "./ui/Avatar";
import { Caret } from "./cozyglow/icons/Caret";

// Menú desprendido
import UserMenuPortal from "./menus/UserMenuPortal";

export default function Header({ rol = "viajero", onToggleRol, onLogout }) {
  const { usuario } = useUser() || {};

  const nombre =
    usuario?.displayName ||
    usuario?.nombre ||
    usuario?.perfil?.nombre ||
    (usuario?.email ? usuario.email.split("@")[0] : "Invitado");

  const etiquetaRol = rol === "viajero" ? "Viajante" : "Conductor";
  const proximoRol = rol === "viajero" ? "conductor" : "viajero";

  // 👉 Items del menú (editá acá lo que quieras)
  const MENU_ITEMS = [
    { label: "Perfil", href: "#perfil" },
    { label: "Verificación", href: "#verificacion" },
    { label: "Reservas", href: "#reservas" },
    { label: "Vehículos", href: "#mis-vehiculos" },
    { label: "Envíos", href: "#envios" },
    { label: "Nuevo viaje", href: "#nuevo-viaje" },
    // { type: "divider" },
    // { label: "Ayuda", href: "#ayuda" },
  ];

  const [menuAbierto, setMenuAbierto] = React.useState(false);
  const btnRef = React.useRef(null);

  function toggleMenu() {
    setMenuAbierto((v) => !v);
  }

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
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
                height: "100%",
              }}
            >
              <div style={{ height: "100%" }}>
                <Avatar />
              </div>
              <Caret size="30px" direction={menuAbierto ? "up" : "down"} />
            </button>

            {/* Cambiar rol */}
            <button
              type="button"
              className="button row neutral"
              onClick={onToggleRol}
              title={`Cambiar a ${proximoRol}`}
              style={{ cursor: "pointer" }}
            >
              <div>{etiquetaRol}</div>
            </button>

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
