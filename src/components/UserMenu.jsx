//src/components/UserMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function UserMenu({ usuario }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // cerrar al hacer click fuera
  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const avatarText =
    (usuario?.displayName?.[0] || usuario?.email?.[0] || "U").toUpperCase();

  async function logout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
      alert("No se pudo cerrar sesión");
    }
  }

  return (
    <div className="user-menu" ref={ref}>
      <button
        className="user-menu__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {usuario?.photoURL ? (
          <img src={usuario.photoURL} alt="Usuario" />
        ) : (
          <span className="avatar-fallback">{avatarText}</span>
        )}
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <NavLink to="/viajes" className="user-menu__item" role="menuitem" onClick={()=>setOpen(false)}>
            Tus viajes
          </NavLink>
          <NavLink to="/mensajes" className="user-menu__item" role="menuitem" onClick={()=>setOpen(false)}>
            Mensajes
          </NavLink>
          <NavLink to="/perfil" className="user-menu__item" role="menuitem" onClick={()=>setOpen(false)}>
            Perfil
          </NavLink>
          <div className="user-menu__divider" />
          <NavLink to="/transferencias" className="user-menu__item" role="menuitem" onClick={()=>setOpen(false)}>
            Transferencias
          </NavLink>
          <NavLink to="/pagos" className="user-menu__item" role="menuitem" onClick={()=>setOpen(false)}>
            Pagos y reembolsos
          </NavLink>
          <div className="user-menu__divider" />
          <button className="user-menu__item danger" role="menuitem" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
