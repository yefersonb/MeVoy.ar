// src/components/PagoButton.js
import React from "react";

export default function PagoButton({ viaje, usuario }) {
  const pagar = async () => {
    try {
      const res = await fetch("http://localhost:3001/create_preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              title: `Viaje a ${viaje.destino}`,
              description: `Desde ${viaje.origen} hasta ${viaje.destino}`,
              unit_price: viaje.precio || 2000,
              quantity: 1,
            },
          ],
          payer: {
            name: usuario.displayName || usuario.email,
            email: usuario.email,
          },
        }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("No se pudo iniciar el pago. Revisá los datos.");
        console.error("Respuesta MP:", data);
      }
    } catch (err) {
      console.error("Error al crear preferencia:", err);
      alert("Error al generar pago con MercadoPago");
    }
  };

  return (
    <button
      style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: "0.5rem" }}
      onClick={pagar}
    >
      Pagar con MercadoPago
    </button>
  );
}
