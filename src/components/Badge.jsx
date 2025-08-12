import React from "react";

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
const variantMap = {
  verificado: { bg: "#ecfdf5", color: "#047857", border: "#0ba579ff" },
  viajes:     { bg: "#f3f4f6", color: "#1f2937", border: "#223044ff" },
  rapido:     { bg: "#f0f5ff", color: "#2563eb", border: "#2563eb" },
};

const base_style = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 999,
  fontSize: "0.7rem",
  fontWeight: 600,
  marginRight: 6,
  marginBottom: 4
};

export default function Badge({ children, variant = "", style = {} }) {
  const styles = variantMap[variant] || { bg: "#eef2f7", color: "#1f2d3d", border: "#0ba579ff" };
  return (
    <span style={{ background: styles.bg, border: "1px solid" + styles.border,color: styles.color, ...base_style }}>
    {children}
    </span>
  );
}