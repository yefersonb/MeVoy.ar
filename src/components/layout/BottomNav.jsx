import React from "react";
import { Search, List, Plus, MoreHorizontal } from "react-feather";

const TABS = {
  viajero: [
    { id: "buscar", label: "Buscar",     Icon: Search },
    { id: "viajes", label: "Mis viajes", Icon: List },
    { id: "mas",    label: "Más",        Icon: MoreHorizontal },
  ],
  conductor: [
    { id: "viajes", label: "Mis viajes", Icon: List },
    { id: "nuevo",  label: "Nueva",      Icon: Plus },
    { id: "mas",    label: "Más",        Icon: MoreHorizontal },
  ],
};

export default function BottomNav({ rol, activeSection, onSectionChange }) {
  const tabs = TABS[rol] ?? TABS.viajero;

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map(({ id, label, Icon }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            className={`bottom-nav__item${active ? " bottom-nav__item--active" : ""}`}
            onClick={() => onSectionChange(id)}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
            <span className="bottom-nav__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
