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
    * May depend on CozyGlow or similar for consistent design.
    * Tho... that might not be neccessary, unless dark/light themes become an issue.
*/
const variantMap = {
  verificado: { bg: "#ecfdf5", color: "#047857" },
  viajes: { bg: "#f3f4f6", color: "#1f2937" },
  rapido: { bg: "#f0f5ff", color: "#2563eb" },
};

export default function Badge({ children, variant = "", style = {} }) {
  const styles = variantMap[variant] || {
    bg: "#eef2f7",
    color: "#1f2d3d",
  };
  return (
    <span
      style={{
        display: "inline-block",
        background: styles.bg,
        color: styles.color,
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: "0.7rem",
        fontWeight: 600,
        marginRight: 6,
        marginBottom: 4,
        ...style,
      }}
    >
      {children}
    </span>
  );
}