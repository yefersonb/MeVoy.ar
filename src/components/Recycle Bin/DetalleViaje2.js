import React from "react";

export default function DetalleViaje({ viaje, onVolver }) {
  if (!viaje) return null;

  return (
    <div style={{ padding: 20 }}>
      <h2>Detalle del Viaje</h2>
      <p><strong>Origen:</strong> {viaje.origen}</p>
      <p><strong>Destino:</strong> {viaje.destino}</p>
      <p><strong>Fecha:</strong> {viaje.fecha}</p>
      <p><strong>Asientos disponibles:</strong> {viaje.asientos}</p>
      <p><strong>Precio estimado:</strong> ${viaje.precio}</p>

      <button onClick={onVolver}>← Volver</button>
    </div>
  );
}
