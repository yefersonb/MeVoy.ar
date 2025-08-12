// src/components/Header.js
import React from "react";
import logo from "../assets/logo/logo_light.png";
import pfp from "../assets/ui/profile_picture_placeholder.png";
import { useUser } from "../contexts/UserContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Header({ rol = "viajero", onToggleRol, onLogout }) {
  const { usuario } = useUser() || {};

  const nombre =
    usuario?.displayName ||
    usuario?.nombre ||
    usuario?.perfil?.nombre ||
    (usuario?.email ? usuario.email.split("@")[0] : "Invitado");

  const foto = usuario?.photoURL || pfp;

  const etiquetaRol = rol === "viajero" ? "Viajante" : "Conductor";
  const proximoRol = rol === "viajero" ? "conductor" : "viajero";

  // Dropdown (overlay fijo y discreto)
  const [menuAbierto, setMenuAbierto] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, right: 16 });
  const btnRef = React.useRef(null);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) setMenuAbierto(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  function toggleMenu() {
    setMenuAbierto((v) => {
      const next = !v;
      if (next && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({
          top: Math.round(r.bottom + 10),
          right: Math.max(8, Math.round(window.innerWidth - r.right)),
        });
      }
      return next;
    });
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
    <header className="header shaded" style={{ overflow: "visible" }}>
      <img src={logo} alt="MeVoy Logo" style={{ height: "100%", opacity: 0.7 }} />

      <div
        className="button borderless row neutral"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "calc(100% - 2rem)",
          gap: "0.8rem",
          height: "100%",
          padding: 0,
        }}
      >
        <div>
          <span id="header-hola">Hola, </span>
          {nombre}
          <span id="header-hola-exclamation">!</span>
        </div>

        {/* Avatar + caret */}
        <button
          ref={btnRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuAbierto}
          onClick={toggleMenu}
          title="Menú de usuario"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "0 8px 0 0",
            borderRadius: 999,
            border: "1px solid #e6e6e6",
            background: "#fff",
            height: 40,
            cursor: "pointer",
          }}
        >
          <img
            src={foto}
            alt="Foto de perfil"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              objectFit: "cover",
              opacity: usuario?.photoURL ? 1 : 0.2,
            }}
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{
              opacity: 0.6,
              transform: menuAbierto ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .15s ease",
            }}
          >
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", height: "100%", gap: "0.5rem" }}>
        <button
          type="button"
          className="button borderless row neutral"
          onClick={onToggleRol}
          title={`Cambiar a ${proximoRol}`}
          style={{ cursor: "pointer" }}
        >
          <div className="arrow animated pointing-right"></div>
          <div>{etiquetaRol}</div>
        </button>

        {/* Dejá este si querés redundancia; el menú ya incluye Cerrar sesión */}
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

      {/* Dropdown overlay */}
      {menuAbierto && (
        <div
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            minWidth: 260,
            maxWidth: 280,
            padding: 8,
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 16,
            boxShadow: "0 10px 25px rgba(0,0,0,.08)",
          }}
        >
          {/* “pico” */}
          <span
            style={{
              position: "absolute",
              top: -6,
              right: 18,
              width: 12,
              height: 12,
              background: "#fff",
              transform: "rotate(45deg)",
              borderLeft: "1px solid #eee",
              borderTop: "1px solid #eee",
            }}
          />

          {/* Links del menú (hash-routing suave) */}
          <a href="#mis-viajes" role="menuitem" onClick={() => setMenuAbierto(false)} style={itemStyle}>
            Mis viajes
          </a>
          <a href="#mis-vehiculos" role="menuitem" onClick={() => setMenuAbierto(false)} style={itemStyle}>
            Mis vehículos
          </a>
          <a href="#reservas" role="menuitem" onClick={() => setMenuAbierto(false)} style={itemStyle}>
            Reservas
          </a>
          <a href="#envios" role="menuitem" onClick={() => setMenuAbierto(false)} style={itemStyle}>
            Envíos
          </a>
          <a href="#nuevo-viaje" role="menuitem" onClick={() => setMenuAbierto(false)} style={itemStyle}>
            Nuevo viaje
          </a>

          <div style={dividerStyle} />

          <button type="button" role="menuitem" onClick={doLogout} style={{ ...itemStyle, color: "#b00020" }}>
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  color: "#111",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};
const dividerStyle = { height: 1, background: "#eee", margin: "6px 4px" };
