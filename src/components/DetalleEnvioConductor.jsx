//DetalleEnvioConductor.jsx

import React, { useState } from "react";
import { auth } from "../firebase";

/**
 * Componente de detalle para CONDUCTOR
 * - Muestra datos clave del envío
 * - Botón "Aceptar envío"
 * - Modal de confirmación
 * - Llama a /api/envios/:envioId/preference y redirige a Mercado Pago
 *
 * Props esperadas:
 *  - envio: {
 *      id, titulo, descripcion, origen, destino, distanciaKm,
 *      precio, precioSugerido, fotos: [url], estado, pagoEstado
 *    }
 */
export default function DetalleEnvioConductor({ envio, onAfterAccept }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!envio) return null;
  const user = auth?.currentUser;
  const bloqueado = envio.estado !== "publicado" || envio.pagoEstado === "approved";

 const handleAceptar = async () => {
  setError("");
  setLoading(true);
  try {
    const res = await fetch(`/api/envios/${envio.id}/aceptar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conductorId: user?.uid || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "No se pudo crear la preferencia");
      // Redirigir a MP
      const goto = data.init_point || data.sandbox_init_point;
      if (!goto) throw new Error("Preferencia creada sin init_point");
      if (typeof onAfterAccept === "function") onAfterAccept(data);
      window.location.href = goto;
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        {Array.isArray(envio.fotos) && envio.fotos[0] && (
          <img src={envio.fotos[0]} alt="foto-envio" className="w-16 h-16 object-cover rounded" />
        )}
        <div>
          <h3 className="text-xl font-semibold">{envio.titulo}</h3>
          <p className="text-sm text-gray-600">{envio.descripcion}</p>
          <p className="text-sm mt-1">Origen: <span className="font-medium">{envio.origen}</span></p>
          <p className="text-sm">Destino: <span className="font-medium">{envio.destino}</span></p>
          {envio.distanciaKm ? (
            <p className="text-sm text-gray-600">Distancia aprox: {envio.distanciaKm} km</p>
          ) : null}
        </div>
      </div>

      {/* Precio */}
      <div className="p-3 border rounded">
        <p className="text-sm">Precio ofrecido: <span className="font-semibold">$ {envio.precio || envio.precioSugerido}</span></p>
        {envio.precioSugerido && envio.precio && envio.precio < envio.precioSugerido && (
          <p className="text-xs text-amber-600 mt-1">(Ojo: menor al sugerido de $ {envio.precioSugerido})</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Estado actual: {envio.estado} • Pago: {envio.pagoEstado || "-"}</p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <button
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
          disabled={bloqueado || loading}
          onClick={() => setOpen(true)}
        >
          {loading ? "Creando pago…" : "Aceptar envío"}
        </button>
        {bloqueado && (
          <span className="text-xs text-gray-500">No disponible en estado: {envio.estado}</span>
        )}
      </div>

      {error && (
        <div className="p-2 text-sm rounded bg-red-50 text-red-700">{error}</div>
      )}

      {/* Modal simple */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-5 w-full max-w-md">
            <h4 className="text-lg font-semibold">Confirmar aceptación</h4>
            <p className="text-sm text-gray-600 mt-2">
              Vas a aceptar este envío y pasar al pago para asegurar la reserva. ¿Continuar?
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button className="px-3 py-2 rounded border" onClick={() => setOpen(false)}>Cancelar</button>
              <button
                className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
                onClick={handleAceptar}
                disabled={loading}
              >
                {loading ? "Procesando…" : "Sí, aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
