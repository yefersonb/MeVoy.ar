import React from "react";

export default function RatingRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <div style={{ fontSize: "0.85rem" }}>{label}</div>
      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{value.toFixed(1)}</div>
    </div>
  );
}