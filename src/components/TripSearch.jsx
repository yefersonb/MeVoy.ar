import React, { useState } from "react";
import { Calendar, Users, Clock, Package, Search } from "react-feather";
import TripDetail from "./TripDetail";
import AutocompleteInput from "./AutocompleteInput";
import useTripsSearch from "../hooks/useTripsSearch";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function TripSearch({ user, onBook }) {
  const { results, loading: loadingHook, filters, setFilters, clear } = useTripsSearch();

  const [origen,       setOrigen]       = useState("");
  const [destino,      setDestino]      = useState("");
  const [fecha,        setFecha]        = useState("");
  const [pasajeros,    setPasajeros]    = useState(1);
  const [momento,      setMomento]      = useState("");
  const [soloPaquetes, setSoloPaquetes] = useState(false);
  const [pesoReq,      setPesoReq]      = useState("");
  const [volumenReq,   setVolumenReq]   = useState("");
  const [detalle,      setDetalle]      = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const loading = loadingHook || loadingAction;

  const parseNumber = (v) => (v === "" || v == null ? null : Number(v));

  const getFechaHora = (v) => {
    if (v?.horario?.toDate) return v.horario.toDate();
    if (v?.horario) return new Date(v.horario);
    if (v?.fecha)   return new Date(v.fecha);
    return null;
  };

  const filtrarExtras = (lista) => {
    const reqPeso = parseNumber(pesoReq);
    const reqVol  = parseNumber(volumenReq);

    return (lista || []).filter((v) => {
      if ((v.asientos ?? 0) < pasajeros) return false;

      if (momento) {
        const hora = getFechaHora(v)?.getHours() ?? null;
        if (hora != null) {
          if (momento === "manana" && !(hora >= 6  && hora < 12)) return false;
          if (momento === "tarde"  && !(hora >= 12 && hora < 18)) return false;
          if (momento === "noche"  && !(hora >= 18 || hora < 6))  return false;
        }
      }

      if (soloPaquetes && !v.aceptaPaquetes) return false;

      if (soloPaquetes && (reqPeso != null || reqVol != null) && v.aceptaPaquetes) {
        const pMax = Number(v.pesoMax);
        const vMax = Number(v.volumenMax);
        if (reqPeso != null && !(pMax >= reqPeso)) return false;
        if (reqVol  != null && !(vMax >= reqVol))  return false;
      }

      return true;
    });
  };

  const listaFinal = filtrarExtras(results);

  const buscar = () => {
    const origText = typeof origen  === "object" ? origen.formatted_address  : origen;
    const destText = typeof destino === "object" ? destino.formatted_address : destino;
    setFilters({ origen: origText || "", destino: destText || "", fecha: fecha || "" });
  };

  const limpiar = () => {
    setOrigen(""); setDestino(""); setFecha(""); setPasajeros(1);
    setMomento(""); setSoloPaquetes(false); setPesoReq(""); setVolumenReq("");
    clear();
  };

  const confirmarReserva = async (viajeId) => {
    if (!user)    { alert("Iniciá sesión para reservar"); return; }
    if (!viajeId) { alert("Error interno: viaje desconocido."); return; }
    setLoadingAction(true);
    try {
      if (typeof onBook === "function") {
        await onBook(viajeId);
      } else {
        await addDoc(collection(db, "viajes", viajeId, "reservas"), {
          viajanteUid:       user.uid,
          fechaReserva:      serverTimestamp(),
          cantidadPasajeros: 1,
          estadoReserva:     "pendiente",
          creadoPor:         user.uid,
        });
        alert("¡Reserva creada! Esperando aprobación del conductor.");
      }
      setDetalle(null);
      buscar();
    } catch (err) {
      console.error("Error creando reserva:", err);
      alert("Hubo un problema al reservar.");
    } finally {
      setLoadingAction(false);
    }
  };

  if (detalle) {
    return (
      <TripDetail
        viaje={detalle}
        pasajeros={pasajeros}
        onClose={() => setDetalle(null)}
        onReservar={() => confirmarReserva(detalle.id)}
        loading={loading}
      />
    );
  }

  return (
    <section className="trip-search">

      {/* Search form panel */}
      <div className="trip-search__form">

        {/* Route picker with connecting line */}
        <div className="route-picker">
          <div className="route-picker__stop">
            <span className="route-picker__dot" />
            <div className="route-picker__input">
              <AutocompleteInput
                placeholder="¿Desde dónde salís?"
                value={typeof origen === "object" ? origen.formatted_address : origen}
                onChange={setOrigen}
              />
            </div>
          </div>
          <div className="route-picker__stop">
            <span className="route-picker__dot route-picker__dot--dest" />
            <div className="route-picker__input">
              <AutocompleteInput
                placeholder="¿A dónde vas?"
                value={typeof destino === "object" ? destino.formatted_address : destino}
                onChange={setDestino}
              />
            </div>
          </div>
        </div>

        {/* Secondary filters */}
        <div className="trip-search__row">
          <div className="trip-search__field">
            <label htmlFor="ts-fecha"><Calendar size={11} /> Fecha</label>
            <input
              id="ts-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="trip-search__field">
            <label htmlFor="ts-pasajeros"><Users size={11} /> Pasajeros</label>
            <select
              id="ts-pasajeros"
              value={pasajeros}
              onChange={(e) => setPasajeros(Number(e.target.value))}
            >
              {[1,2,3,4,5,6].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "pasajero" : "pasajeros"}</option>
              ))}
            </select>
          </div>
          <div className="trip-search__field">
            <label htmlFor="ts-momento"><Clock size={11} /> Horario</label>
            <select
              id="ts-momento"
              value={momento}
              onChange={(e) => setMomento(e.target.value)}
            >
              <option value="">Cualquiera</option>
              <option value="manana">Mañana (06–12)</option>
              <option value="tarde">Tarde (12–18)</option>
              <option value="noche">Noche (18–06)</option>
            </select>
          </div>
        </div>

        {/* Package toggle chip */}
        <button
          type="button"
          className={`pkg-toggle${soloPaquetes ? " pkg-toggle--active" : ""}`}
          onClick={() => setSoloPaquetes((v) => !v)}
        >
          <Package size={14} />
          Solo con paquetes
        </button>

        {soloPaquetes && (
          <div className="trip-search__row">
            <div className="trip-search__field">
              <label htmlFor="ts-peso"><Package size={11} /> Peso (kg)</label>
              <input
                id="ts-peso"
                type="number" min={0} step="0.1"
                value={pesoReq}
                onChange={(e) => setPesoReq(e.target.value)}
                placeholder="Ej: 3"
              />
            </div>
            <div className="trip-search__field">
              <label htmlFor="ts-vol">Volumen (L)</label>
              <input
                id="ts-vol"
                type="number" min={0} step="0.1"
                value={volumenReq}
                onChange={(e) => setVolumenReq(e.target.value)}
                placeholder="Ej: 15"
              />
            </div>
          </div>
        )}

        <button
          onClick={buscar}
          disabled={loading}
          className="button button--fill"
        >
          <Search size={15} />
          {loading ? "Buscando…" : "Buscar viajes"}
        </button>
      </div>

      {/* Results */}
      {listaFinal.length > 0 && (
        <ul className="trip-search__results">
          {listaFinal.map((v) => {
            const fechaViaje = getFechaHora(v);
            return (
              <li key={v.id} className="trip-card">
                <div className="trip-card__route">
                  <span className="trip-card__city">{v.origen}</span>
                  <span className="trip-card__arrow">→</span>
                  <span className="trip-card__city">{v.destino}</span>
                </div>

                <div className="trip-card__meta">
                  {fechaViaje && (
                    <span className="trip-card__meta-item">
                      <Calendar size={12} />
                      {fechaViaje.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  )}
                  {fechaViaje && (
                    <span className="trip-card__meta-item">
                      <Clock size={12} />
                      {fechaViaje.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <span className="trip-card__meta-item">
                    <Users size={12} />
                    {v.asientos ?? "?"} asiento{v.asientos !== 1 ? "s" : ""}
                  </span>
                </div>

                {v.aceptaPaquetes && (
                  <div className="trip-card__packages">
                    <Package size={12} />
                    <span>Acepta paquetes</span>
                    {v.pesoMax    && <span>· {v.pesoMax} kg máx</span>}
                    {v.volumenMax && <span>· {v.volumenMax} L máx</span>}
                    {v.costoBasePaquete != null && (
                      <span>· Desde ${Number(v.costoBasePaquete).toLocaleString("es-AR")}</span>
                    )}
                  </div>
                )}

                <div className="trip-card__actions">
                  <button className="button button--outline" onClick={() => setDetalle(v)}>
                    Ver detalles
                  </button>
                  <button
                    className="button"
                    onClick={() => confirmarReserva(v.id)}
                    disabled={loading}
                  >
                    Reservar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && listaFinal.length === 0 && filters.origen && (
        <p className="trip-search__empty">
          No hay viajes disponibles para esa búsqueda.
        </p>
      )}

      {!loading && !filters.origen && (
        <p className="trip-search__hint">
          Ingresá origen y destino para ver los viajes disponibles.
        </p>
      )}
    </section>
  );
}
