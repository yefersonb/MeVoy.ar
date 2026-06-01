import React, { useState, useEffect } from "react";
import { Calendar, Clock, Users, Package, MapPin } from "react-feather";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, getDoc, getDocs } from "firebase/firestore";
import AutocompleteInput from "./AutocompleteInput";
import { useToast } from "../contexts/ToastContext";
import Spinner from "./common/Spinner";
import InputField from "./ui/InputField";

function pad(n) { return String(n).padStart(2, "0"); }
function defaultDate() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function defaultTime() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OriginPin() {
    return (
        <svg className="route-pin route-pin--origin" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="8" r="2" fill="currentColor" />
            <path d="M16 14c0-1.5-1.5-2.5-4-2.5s-4 1.5-4 2.5" />
        </svg>
    );
}

function DestinationPin() {
    return (
        <svg className="route-pin route-pin--dest" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="currentColor" />
            <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
    );
}

export default function NewTrip({ onGoToVehicles }) {
    const toast = useToast();

    const [origen, setOrigen]   = useState("");
    const [destino, setDestino] = useState("");
    const [fecha, setFecha]     = useState(defaultDate());
    const [hora, setHora]       = useState(defaultTime());
    const [asientos, setAsientos] = useState(1);
    const [loading, setLoading] = useState(false);

    const [vehiculos, setVehiculos]                   = useState([]);
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
    const [vehiculosCargando, setVehiculosCargando]   = useState(true);

    const [aceptaPaquetes, setAceptaPaquetes] = useState(false);
    const [pesoMax, setPesoMax]               = useState("");
    const [volumenMax, setVolumenMax]         = useState("");
    const [costoBasePaquete, setCostoBasePaquete] = useState("");

    // Auto-detect origin from geolocation
    useEffect(() => {
        if (!origen && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async ({ coords }) => {
                    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                    try {
                        const res  = await fetch(
                            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${key}`
                        );
                        const json = await res.json();
                        const raw  = json.results?.[0]?.formatted_address || "Ubicación detectada";
                        const clean = raw.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2},\s*/, "");
                        setOrigen({
                            formatted_address: clean,
                            geometry: { location: { lat: () => coords.latitude, lng: () => coords.longitude } },
                        });
                    } catch {
                        setOrigen({ formatted_address: "Ubicación detectada",
                            geometry: { location: { lat: () => coords.latitude, lng: () => coords.longitude } } });
                    }
                },
                () => {}
            );
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load driver's vehicles
    useEffect(() => {
        const load = async () => {
            setVehiculosCargando(true);
            if (!auth.currentUser) { setVehiculosCargando(false); return; }
            try {
                const snap = await getDocs(collection(db, "usuarios", auth.currentUser.uid, "vehiculos"));
                const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setVehiculos(lista);
                if (lista.length === 1) setVehiculoSeleccionado(lista[0]);
            } catch (e) {
                console.error("Error loading vehicles:", e);
            } finally {
                setVehiculosCargando(false);
            }
        };
        load();
    }, []);

    const incompleto = !origen || !destino || !fecha || !hora || asientos < 1 || !vehiculoSeleccionado;

    const reset = () => {
        setOrigen(""); setDestino("");
        setFecha(defaultDate()); setHora(defaultTime());
        setAsientos(1);
        setVehiculoSeleccionado(vehiculos.length === 1 ? vehiculos[0] : null);
        setAceptaPaquetes(false); setPesoMax(""); setVolumenMax(""); setCostoBasePaquete("");
    };

    const publicarViaje = async () => {
        if (!auth.currentUser) { toast.error("Iniciá sesión para publicar."); return; }
        if (!origen || !destino || !fecha || !hora) { toast.error("Completá origen, destino, fecha y hora."); return; }
        if (!vehiculoSeleccionado) { toast.error("Seleccioná un vehículo para el viaje."); return; }

        if (aceptaPaquetes) {
            if (!pesoMax || !volumenMax || !costoBasePaquete) {
                toast.error("Completá peso máximo, volumen y costo base de paquete."); return;
            }
            if (Number(pesoMax) <= 0 || Number(volumenMax) <= 0 || Number(costoBasePaquete) <= 0) {
                toast.error("Los valores de paquetes deben ser mayores a cero."); return;
            }
        }

        setLoading(true);
        try {
            const snap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
            if (!snap.exists()) { toast.error("Completá tu perfil antes de publicar."); return; }
            const u = snap.data();

            if (!u.nombre && !auth.currentUser.displayName) {
                toast.error("Agregá tu nombre en el perfil antes de publicar."); return;
            }
            if (!u.whatsapp) {
                toast.error("Agregá tu WhatsApp en el perfil antes de publicar."); return;
            }

            const oStr    = typeof origen  === "object" ? origen.formatted_address  : origen;
            const dStr    = typeof destino === "object" ? destino.formatted_address : destino;
            const oCoords = origen?.geometry?.location
                ? { lat: origen.geometry.location.lat(),  lng: origen.geometry.location.lng()  } : null;
            const dCoords = destino?.geometry?.location
                ? { lat: destino.geometry.location.lat(), lng: destino.geometry.location.lng() } : null;

            await addDoc(collection(db, "viajes"), {
                origen: oStr,
                destino: dStr,
                origenCoords: oCoords,
                destinoCoords: dCoords,
                fecha,
                horario: `${fecha}T${hora}`,
                asientos,
                creado: new Date(),
                conductor: {
                    uid:      auth.currentUser.uid,
                    nombre:   u.nombre || auth.currentUser.displayName || "Sin nombre",
                    whatsapp: u.whatsapp || "",
                },
                vehiculo: {
                    id:      vehiculoSeleccionado.id,
                    brand:   vehiculoSeleccionado.brand  || null,
                    model:   vehiculoSeleccionado.model  || null,
                    plate:   vehiculoSeleccionado.plate  || null,
                    seats:   vehiculoSeleccionado.seats  || null,
                },
                aceptaPaquetes,
                pesoMax:          aceptaPaquetes ? Number(pesoMax)          : null,
                volumenMax:       aceptaPaquetes ? Number(volumenMax)       : null,
                costoBasePaquete: aceptaPaquetes ? Number(costoBasePaquete) : null,
            });

            toast.success("¡Viaje publicado! Los pasajeros ya pueden verlo.");
            reset();
        } catch (e) {
            console.error(e);
            toast.error("No se pudo publicar el viaje. Intentá de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="trip-search">

            <div className="trip-search__form">

                {/* Route */}
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

                {/* Date / time / seats */}
                <div className="trip-search__row">
                    <div className="trip-search__field">
                        <label htmlFor="nt-fecha"><Calendar size={11} /> Fecha</label>
                        <input id="nt-fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                    </div>
                    <div className="trip-search__field">
                        <label htmlFor="nt-hora"><Clock size={11} /> Hora</label>
                        <input id="nt-hora" type="time" value={hora} onChange={e => setHora(e.target.value)} />
                    </div>
                    <div className="trip-search__field">
                        <label htmlFor="nt-asientos"><Users size={11} /> Asientos</label>
                        <select id="nt-asientos" value={asientos} onChange={e => setAsientos(Number(e.target.value))}>
                            {[1,2,3,4,5,6,7,8].map(n => (
                                <option key={n} value={n}>{n} {n === 1 ? "asiento" : "asientos"}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Package toggle */}
                <div className="trip-search__row" style={{ flexWrap: "wrap", gap: 12 }}>
                    <button
                        type="button"
                        className={`pkg-toggle${aceptaPaquetes ? " pkg-toggle--active" : ""}`}
                        onClick={() => setAceptaPaquetes(v => !v)}
                    >
                        <Package size={14} />
                        Aceptar paquetes
                    </button>

                    {aceptaPaquetes && (
                        <div className="trip-search__row" style={{ flex: 1, flexWrap: "wrap", gap: 12 }}>
                            <div className="trip-search__field">
                                <label htmlFor="nt-peso"><Package size={11} /> Peso máx. (kg)</label>
                                <input id="nt-peso" type="number" min={0} step="0.1"
                                    value={pesoMax} onChange={e => setPesoMax(e.target.value)} placeholder="Ej: 20" />
                            </div>
                            <div className="trip-search__field">
                                <label htmlFor="nt-vol">Volumen máx. (L)</label>
                                <input id="nt-vol" type="number" min={0} step="0.1"
                                    value={volumenMax} onChange={e => setVolumenMax(e.target.value)} placeholder="Ej: 100" />
                            </div>
                            <div className="trip-search__field">
                                <label htmlFor="nt-costo">Costo base (ARS)</label>
                                <input id="nt-costo" type="number" min={0} step="1"
                                    value={costoBasePaquete} onChange={e => setCostoBasePaquete(e.target.value)} placeholder="Ej: 3000" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Vehicle selector */}
                {vehiculosCargando ? (
                    <div className="spinner-wrap" style={{ height: "3rem" }}><Spinner /></div>
                ) : vehiculos.length === 0 ? (
                    <button
                        type="button"
                        className="new-trip__no-vehicle"
                        onClick={onGoToVehicles}
                        style={{ width: "100%", cursor: onGoToVehicles ? "pointer" : "default", background: "none", border: "none", textAlign: "left" }}
                    >
                        <MapPin size={20} />
                        <span>
                            No tenés vehículos registrados.{" "}
                            {onGoToVehicles
                                ? <strong style={{ color: "var(--color-primary)" }}>Agregá uno acá →</strong>
                                : <>Agregá uno en la pestaña <strong>Vehículos</strong>.</>
                            }
                        </span>
                    </button>
                ) : (
                    <div className="rack-s">
                        <label htmlFor="nt-vehiculo" className="trip-search__field">
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                Vehículo
                            </span>
                        </label>
                        <select
                            id="nt-vehiculo"
                            value={vehiculoSeleccionado?.id || ""}
                            onChange={e => setVehiculoSeleccionado(vehiculos.find(v => v.id === e.target.value) || null)}
                        >
                            <option value="" disabled>Seleccioná un vehículo</option>
                            {vehiculos.map(v => (
                                <option key={v.id} value={v.id}>
                                    {`${v.brand || ""} ${v.model || ""}`.trim()}{v.plate ? ` — ${v.plate}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    className="button button--fill"
                    onClick={publicarViaje}
                    disabled={incompleto || loading}
                >
                    {loading ? "Publicando…" : "Publicar viaje"}
                </button>
            </div>
        </div>
    );
}
