import React, { useState } from "react";
import { Calendar, Users, Clock, Package, Search, Filter } from "react-feather";

function OriginPin() {
    return (
        <svg className="route-pin route-pin--origin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="8" r="2" fill="currentColor" />
            <path d="M16 14c0-1.5-1.5-2.5-4-2.5s-4 1.5-4 2.5" />
        </svg>
    );
}

function DestinationPin() {
    return (
        <svg className="route-pin route-pin--dest" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="currentColor" />
            <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
    );
}
import TripDetail from "./TripDetail";
import AutocompleteInput from "./AutocompleteInput";
import { useDrawer } from "../contexts/UserCardContext";
import useTripsSearch from "../hooks/useTripsSearch";

export default function TripSearch({ user, onBook }) {
    const { results, loading, filters, setFilters, clear } = useTripsSearch();
    const { openDrawer } = useDrawer();

    const [origen, setOrigen] = useState("");
    const [destino, setDestino] = useState("");
    const [fecha, setFecha] = useState("");
    const [pasajeros, setPasajeros] = useState(1);
    const [momento, setMomento] = useState("");
    const [soloPaquetes, setSoloPaquetes] = useState(false);
    const [pesoReq, setPesoReq] = useState("");
    const [volumenReq, setVolumenReq] = useState("");

    const parseNumber = (v) => (v === "" || v == null ? null : Number(v));

    const getFechaHora = (v) => {
        if (v?.horario?.toDate) return v.horario.toDate();
        if (v?.horario) return new Date(v.horario);
        if (v?.fecha) return new Date(v.fecha);
        return null;
    };

    const filtrarExtras = (lista) => {
        const reqPeso = parseNumber(pesoReq);
        const reqVol = parseNumber(volumenReq);

        return (lista || []).filter((v) => {
            if ((v.asientos ?? 0) < pasajeros) return false;

            if (momento) {
                const hora = getFechaHora(v)?.getHours() ?? null;
                if (hora != null) {
                    if (momento === "manana" && !(hora >= 6 && hora < 12)) return false;
                    if (momento === "tarde" && !(hora >= 12 && hora < 18)) return false;
                    if (momento === "noche" && !(hora >= 18 || hora < 6)) return false;
                }
            }

            if (soloPaquetes && !v.aceptaPaquetes) return false;

            if (soloPaquetes && (reqPeso != null || reqVol != null) && v.aceptaPaquetes) {
                const pMax = Number(v.pesoMax);
                const vMax = Number(v.volumenMax);
                if (reqPeso != null && !(pMax >= reqPeso)) return false;
                if (reqVol != null && !(vMax >= reqVol)) return false;
            }

            return true;
        });
    };

    const listaFinal = filtrarExtras(results);

    const buscar = () => {
        const origText = typeof origen === "object" ? origen.formatted_address : origen;
        const destText = typeof destino === "object" ? destino.formatted_address : destino;
        setFilters({ origen: origText || "", destino: destText || "", fecha: fecha || "" });
    };

    const limpiar = () => {
        setOrigen(""); setDestino(""); setFecha(""); setPasajeros(1);
        setMomento(""); setSoloPaquetes(false); setPesoReq(""); setVolumenReq("");
        clear();
    };

    const openTrip = (viaje) =>
        openDrawer(<TripDetail viaje={viaje} pasajeros={pasajeros} />, "Detalle de viaje");

    return (
        <section className="trip-search">
            <div style={{margin: "auto", fontSize: "large", fontWeight: "bolder"}}>¿A dónde vas hoy?</div>

            {/* Search form panel */}
            <div className="trip-search__form">

                {/* Route picker with connecting line */}
                <div className="route-picker">
                    <div className="route-picker__stop">
                        <OriginPin />
                        <div className="route-picker__input">
                            <AutocompleteInput
                                placeholder="¿Desde dónde salís?"
                                value={typeof origen === "object" ? origen.formatted_address : origen}
                                onChange={setOrigen}
                            />
                        </div>
                    </div>
                    <div className="route-picker__stop">
                        <DestinationPin />
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
                <fieldset className="trip-search__row">
                    <legend><Filter size={16}></Filter></legend>
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
                            {[1, 2, 3, 4, 5, 6].map((n) => (
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
                </fieldset>


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
                                        {v.pesoMax && <span>· {v.pesoMax} kg máx</span>}
                                        {v.volumenMax && <span>· {v.volumenMax} L máx</span>}
                                        {v.costoBasePaquete != null && (
                                            <span>· Desde ${Number(v.costoBasePaquete).toLocaleString("es-AR")}</span>
                                        )}
                                    </div>
                                )}

                                <div className="trip-card__actions">
                                    <button className="button" onClick={() => openTrip(v)}>
                                        Ver detalles
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
                </p>
            )}
        </section>
    );
}
