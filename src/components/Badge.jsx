/**
 * Badge reutilizable para trust signals.
 * Props:
 * - children
 * - variant: "verificado" | "viajes" | "rapido" | string
 */

/*
  ToDo:
    * Implement as actual badges, using icons and better styles.
*/

import React from "react";

// Icons
import { Star, Clock } from "react-feather"

const variantMap = {
  verificado: { bg: "#ecfdf5", color: "#047857", border: "#0ba579ff" },
  viajes:     { bg: "#f3f4f6", color: "#1f2937", border: "#223044ff" },
  rapido:     { bg: "#f0f5ff", color: "#2563eb", border: "#2563eb" },
};

const base_style = {
  padding: "4px 12px",
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 9999,
  fontSize: "0.7rem",
  fontWeight: 600,
  height: "1.8rem"
};

// ToDo: Fix line height with icons
export default function Badge({ children, variant = "", style = {} }) {
  const styles = variantMap[variant] || { bg: "#eef2f7", color: "#1f2d3d", border: "#0ba579ff" };
  return (
    <span style={{ background: styles.bg, border: "1px solid" + styles.border,color: styles.color, ...base_style }}>
      {(variant == "verificado") && (" ✓ ")}
      {(variant == "viajes") && (<Star style={{height: "1rem", marginLeft: "-0.5rem"}}/>)}
      {(variant == "rapido") && (<Clock style={{height: "1rem", marginLeft: "-0.5rem"}}/>)}
      {children}
    </span>
  );
}