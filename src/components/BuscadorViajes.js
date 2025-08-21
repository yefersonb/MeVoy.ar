// src/components/BuscadorViajes.jsx
import React, { useState } from "react";
import DetalleViaje from "./DetalleViaje";
import AutocompleteInput from "./AutocompleteInput";
import useViajesSearch from "../hooks/useViajesSearch";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Props:
 * - usuario
 * - onReservar?: (viajeId: string) => Promise<void> | void
 */
export default function BuscadorViajes({ usuario, onReservar }) {
  // ---------- estilos ----------
  const inputStyle = {
    width: "100%",
    padding: "0.5rem",
    margin: "0.5rem 0",
    border: "1px solid #ccc",
    borderRadius: "0.5rem",
    fontFamily: "inherit",
    fontSize: "1rem",
  };
  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    marginBottom: "0.25rem",
    fontWeight: 500,
  };

  // ---------- hook de búsqueda ----------
  const { resultados, loading: loadingHook, filters, setFilters, clear } = useViajesSearch();

  // UI controlada local
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [pasajeros, setPasajeros] = useState(1);
  const [momento, setMomento] = useState("");

  // Paquetes
  const [soloPaquetes, setSoloPaquetes] = useState(false);
  const [pesoReq, setPesoReq] = useState("");
  const [volumenReq, setVolumenReq] = useState("");

  const [detalle, setDetalle] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // ---------- helpers ----------
  const parseNumber = (v) => (v === "" || v == null ? null : Number(v));

  const getFechaHora = (v) => {
    // soporta v.horario (Timestamp o fecha) y v.fecha (ISO)
    let d = null;
    if (v?.horario?.toDate) d = v.horario.toDate();
    else if (v?.horario) d = new Date(v.horario);
    else if (v?.fecha) d = new Date(v.fecha);
    return d || null;
  };

  // aplica filtros extra encima de los de origen/destino/fecha del hook
  const filtrarExtras = (lista) => {
    const reqPeso = parseNumber(pesoReq);
    const reqVol = parseNumber(volumenReq);

    return (lista || []).filter((v) => {
      const asientosOk = (v.asientos ?? 0) >= pasajeros;

      // Momento (según hora)
      let momentoOk = true;
      if (momento) {
        const fechaViaje = getFechaHora(v);
        const hour = fechaViaje ? fechaViaje.getHours() : null;
        if (hour != null) {
          if (momento === "manana") momentoOk = hour >= 6 && hour < 12;
          else if (momento === "tarde") momentoOk = hour >= 12 && hour < 18;
          else if (momento === "noche") momentoOk = hour >= 18 || hour < 6;
        }
      }

      // Paquetes
      const aceptaPaquetesOk = soloPaquetes ? !!v.aceptaPaquetes : true;

      // Peso / Volumen
      let pesoVolOk = true;
      if (soloPaquetes && (reqPeso != null || reqVol != null)) {
        if (!v.aceptaPaquetes) {
          pesoVolOk = false;
        } else {
          const pMax = typeof v.pesoMax === "number" ? v.pesoMax : Number(v.pesoMax);
          const vMax = typeof v.volumenMax === "number" ? v.volumenMax : Number(v.volumenMax);
          if (reqPeso != null && !(pMax >= reqPeso)) pesoVolOk = false;
          if (reqVol != null && !(vMax >= reqVol)) pesoVolOk = false;
        }
      }

      return asientosOk && momentoOk && aceptaPaquetesOk && pesoVolOk;
    });
  };

  const listaFinal = filtrarExtras(resultados);
  const loading = loadingHook || loadingAction;

  // ---------- acciones ----------
  const buscar = () => {
    const origText = typeof origen === "object" ? origen.formatted_address : origen;
    const destText = typeof destino === "object" ? destino.formatted_address : destino;
    setFilters({ origen: origText || "", destino: destText || "", fecha: fecha || "" });
  };

  const limpiar = () => {
    setOrigen("");
    setDestino("");
    setFecha("");
    setPasajeros(1);
    setMomento("");
    setSoloPaquetes(false);
    setPesoReq("");
    setVolumenReq("");
    clear();
  };

  const confirmarReserva = async (viajeId) => {
    if (!usuario) {
      alert("Iniciá sesión para reservar");
      return;
    }
    if (!viajeId) {
      alert("Error interno: viaje desconocido.");
      return;
    }
    setLoadingAction(true);
    try {
      if (typeof onReservar === "function") {
        // Usá la lógica del padre (App.reservarViaje)
        await onReservar(viajeId);
      } else {
        // Fallback local: crea reserva básica
        const reservasCol = collection(db, "viajes", viajeId, "reservas");
        await addDoc(reservasCol, {
          viajanteUid: usuario.uid,
          fechaReserva: serverTimestamp(),
          cantidadPasajeros: 1,
          estadoReserva: "pendiente",
          creadoPor: usuario.uid,
        });
        alert("¡Reserva creada! Esperando aprobación del conductor.");
      }
      setDetalle(null);
      buscar(); // refresca resultados
    } catch (err) {
      console.error("Error creando reserva:", err);
      alert("Hubo un problema al reservar.");
    } finally {
      setLoadingAction(false);
    }
  };

  // ---------- detalle ----------
  if (detalle) {
    return (
      <DetalleViaje
        viaje={detalle}
        pasajeros={pasajeros}
        onClose={() => setDetalle(null)}
        onReservar={() => confirmarReserva(detalle.id)}
        loading={loading}
      />
    );
  }

  // ---------- UI ----------
  return (
    <section style={{ padding: "1rem" }}>
      <h3
        style={{
          fontSize: "1.125rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
          textAlign: "center",
        }}
      >
        Buscar viajes
      </h3>

      {/* ----- BUSCADOR DE VIAJES ----- */}
      <div style={{ margin: "0.5rem 0" }}>
        <label htmlFor="origen" style={labelStyle}>Origen</label>
        <AutocompleteInput
          id="origen"
          placeholder="Ingresá origen"
          value={typeof origen === "object" ? origen.formatted_address : origen}
          onChange={setOrigen}
        />
      </div>

      <div style={{ margin: "0.5rem 0" }}>
        <label htmlFor="destino" style={labelStyle}>Destino</label>
        <AutocompleteInput
          id="destino"
          placeholder="Ingresá destino"
          value={typeof destino === "object" ? destino.formatted_address : destino}
          onChange={setDestino}
        />
      </div>

      <div style={{ margin: "0.5rem 0" }}>
        <label htmlFor="fecha" style={labelStyle}>Fecha</label>
        <input
          id="fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ margin: "0.5rem 0" }}>
        <label htmlFor="momento" style={labelStyle}>Momento del día</label>
        <select
          id="momento"
          value={momento}
          onChange={(e) => setMomento(e.target.value)}
          style={inputStyle}
        >
          <option value="">Cualquiera</option>
          <option value="manana">Mañana (06â€“12)</option>
          <option value="tarde">Tarde (12â€“18)</option>
          <option value="noche">Noche (18â€“06)</option>
        </select>
      </div>

      <div style={{ margin: "0.5rem 0" }}>
        <label htmlFor="pasajeros" style={labelStyle}>Pasajeros</label>
        <select
          id="pasajeros"
          value={pasajeros}
          onChange={(e) => setPasajeros(Number(e.target.value))}
          style={inputStyle}
        >
          {[...Array(6)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} pasajero{i > 0 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Paquetes */}
      <div style={{ margin: "1rem 0", padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={soloPaquetes}
            onChange={(e) => setSoloPaquetes(e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Solo viajes que aceptan paquetes</span>
        </label>

        {soloPaquetes && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Peso a enviar (kg) â€” opcional</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={pesoReq}
                onChange={(e) => setPesoReq(e.target.value)}
                placeholder="Ej: 3"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Volumen (L) â€” opcional</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={volumenReq}
                onChange={(e) => setVolumenReq(e.target.value)}
                placeholder="Ej: 15"
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={buscar}
        disabled={loading}
        style={{
          backgroundColor: "var(--color-primary-700)",
          color: "white",
          padding: "0.75rem",
          border: "none",
          borderRadius: "0.375rem",
          fontFamily: "inherit",
          width: "100%",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "1rem",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Buscandoâ€¦" : "Buscar"}
      </button>

      {/* Resultados */}
      <div style={{ marginTop: "1.5rem" }}>
        {listaFinal.length === 0 ? (
          <p style={{ color: "#4b5563" }}>
            {loading ? "Cargando resultadosâ€¦" : `No hay viajes disponibles${soloPaquetes ? " que acepten paquetes" : ""}.`}
          </p>
        ) : (
          listaFinal.map((v) => {
            const fechaViaje = getFechaHora(v);
            return (
              <div
                key={v.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "0.5rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ fontWeight: 500 }}>
                  {v.origen} â†’ {v.destino}
                </p>
                {fechaViaje && (
                  <p style={{ fontSize: "0.875rem" }}>
                    {fechaViaje.toLocaleString()}
                  </p>
                )}
                <p style={{ fontSize: "0.875rem" }}>Asientos: {v.asientos ?? "-"}</p>

                {v.aceptaPaquetes && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      background: "#eef2ff",
                      color: "#3730a3",
                      padding: "6px 10px",
                      borderRadius: 999,
                    }}
                  >
                    <span>ðŸ“¦ Acepta paquetes</span>
                    <span>â€¢ Peso máx: <strong>{v.pesoMax ?? "â€”"}</strong> kg</span>
                    <span>â€¢ Volumen máx: <strong>{v.volumenMax ?? "â€”"}</strong> L</span>
                    {v.costoBasePaquete != null && (
                      <span>â€¢ Desde <strong>${Number(v.costoBasePaquete).toLocaleString("es-AR")}</strong></span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button
                    onClick={() => setDetalle(v)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      backgroundColor: "var(--color-primary)",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Ver detalles
                  </button>
                  <button
                    onClick={() => confirmarReserva(v.id)}
                    disabled={loading}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      backgroundColor: loading ? "#a5d1c2" : "#10b981",
                      color: "white",
                      border: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    Reservar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

