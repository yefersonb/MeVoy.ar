import React from "react";
import { useUser } from "../contexts/UserContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// UI
import logo from "../assets/logo/logo_light.png";
import Avatar from "./ui/Avatar"
import { Caret } from "./cozyglow/icons/Caret"


export default function Header({ rol = "viajero", onToggleRol, onLogout }) {
  const { usuario } = useUser() || {};

  const nombre =
    usuario?.displayName ||
    usuario?.nombre ||
    usuario?.perfil?.nombre ||
    (usuario?.email ? usuario.email.split("@")[0] : "Invitado");

  //const foto = usuario?.photoURL || pfp;

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
    <div>
      <div className="header-container">
        <div className="header">
          <div className="module">
            <img src={logo} alt="MeVoy Logo" style={{ height: "70%" }} />
            <div>
              <span id="header-hola">Hola, </span>
              {nombre}
              <span id="header-hola-exclamation">!</span>
            </div>
          </div>

          <div className="module">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.8rem", height: "100%", padding: 0}}>
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
                    gap: "0.1rem",
                    padding: "0.1rem",
                    borderRadius: 999,
                    border: "1px solid #e6e6e6",
                    background: "#fff",
                    cursor: "pointer",
                    height: "100%"
                  }}
                >
                <div style={{height: "100%"}}>
                  <Avatar />
                </div>
                <Caret size="30px" direction={menuAbierto ? "up" : "down"}/>
              </button>
            </div>
            <button
                type="button"
                className="button row neutral"
                onClick={onToggleRol}
                title={`Cambiar a ${proximoRol}`}
                style={{ cursor: "pointer" }}
              >
              <div>{etiquetaRol}</div>
            </button>
          </div>
        </div>

        {/* ToDo: Este dropdown no debería estar acá. En su luar, debería ser un componente */}
          <div style={{ display: "flex", alignItems: "center", height: "100%", gap: "0.5rem" }}>

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
      </div>
    </div>
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
