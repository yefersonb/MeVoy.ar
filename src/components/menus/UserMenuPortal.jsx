// src/components/menus/UserMenuPortal.jsx
import React from "react";
import { createPortal } from "react-dom";

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  color: "var(--color-text)",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const dividerStyle = { height: 1, background: "var(--color-border)", margin: "6px 4px" };

export default function UserMenuPortal({
  open,
  anchorRef,
  onClose,
  onLogout,
  items,
}) {
  const menuRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, right: 16 });

  const DEFAULT_ITEMS = [
    { label: "Perfil", href: "#perfil" },
    { label: "Reservas", href: "#reservas" },
    { label: "Vehículos", href: "#mis-vehiculos" },
    { label: "Envíos", href: "#envios" },
    { label: "Nuevo viaje", href: "#nuevo-viaje" },
  ];
  const links = items && items.length ? items : DEFAULT_ITEMS;

  React.useEffect(() => {
    function updatePos() {
      const btn = anchorRef?.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setPos({
        top: Math.round(r.bottom + 10),
        right: Math.max(8, Math.round(window.innerWidth - r.right)),
      });
    }

    function handleOutside(e) {
      if (!open) return;
      const inBtn = anchorRef?.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inBtn && !inMenu) onClose?.();
    }

    function onEsc(e) {
      if (e.key === "Escape") onClose?.();
    }

    if (open) updatePos();

    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  const menu = (
    <div
      id="user-menu"
      role="menu"
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
        minWidth: 260,
        maxWidth: 280,
        padding: 8,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        boxShadow: "0 10px 25px rgba(0,0,0,.08)",
      }}
    >
      {/* pico */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -6,
          right: 18,
          width: 12,
          height: 12,
          background: "var(--color-surface)",
          transform: "rotate(45deg)",
          borderLeft: "1px solid var(--color-border)",
          borderTop: "1px solid var(--color-border)",
        }}
      />

      {/* Links dinámicos */}
      {links.map((it, idx) =>
        it?.type === "divider" ? (
          <div key={`div-${idx}`} style={dividerStyle} />
        ) : (
          <a
            key={it.href || it.label || idx}
            href={it.href || "#"}
            role="menuitem"
            onClick={onClose}
            style={itemStyle}
            className="menu-item"
          >
            {it.label}
          </a>
        )
      )}

      <div style={dividerStyle} />

      <button
        type="button"
        role="menuitem"
        onClick={onLogout}
        style={{ ...itemStyle, color: "var(--color-danger)" }}
      >
        Cerrar sesión
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}

