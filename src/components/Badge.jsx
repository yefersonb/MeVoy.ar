/**
 * Badge reutilizable para trust signals.
 * Props:
 * - children
 * - variant: "verificado" | "viajes" | "rapido" | string
 */

/*
  ToDo:
    * Implement as actual badges, using icons and better styles.

  ToDo: Refactorizar para usar un Badge Manager
*/

import React from "react";

// Icons
import { Star, Clock } from "react-feather"
import { License } from "./cozyglow/icons/License"

const variantMap = {
  verificado: { bg: "#047857f0", color: "#047857", border: "#fff2" },
  viajes:     { bg: "#fff1", color: "var(--color-text)", border: "#fff2" },
  rapido:     { bg: "#fff1", color: "var(--color-primary-700)", border: "#fff2" },
};

const base_style = {
  padding: "4px 12px",
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 9999,
  fontSize: "0.7rem",
  fontWeight: 600,
  height: "1.8rem",
  whiteSpace: "nowrap"
};

// ToDo: Ajustar la altura de linea de los iconos, ahora mismo esto usa un simple hack
export default function Badge({ children, variant = "", color="", style = {} }) {
  const styles = variantMap[variant] || { bg: "#eef2f7", color: "#1f2d3d", border: "#0ba579ff" };
  return (
    <span style={{ background: color || styles.bg, border: "1px solid" + styles.border, color: "#fff9", ...base_style }}>
      {(variant == "verificado") && (<License style={{height: "1rem", marginLeft: "-0.5rem"}}/>)}
      {(variant == "viajes")     && (<Star    style={{height: "1rem", marginLeft: "-0.5rem"}}/>)}
      {(variant == "rapido")     && (<Clock   style={{height: "1rem", marginLeft: "-0.5rem"}}/>)}
      {children}
    </span>
  );
}
