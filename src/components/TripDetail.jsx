import React, { useState, useEffect } from "react";
import {
    GoogleMap,
    Marker,
    DirectionsRenderer,
    useJsApiLoader,
} from "@react-google-maps/api";
import { Package, Truck, MapPin, ChevronRight } from "react-feather";
import { MAP_LOADER_OPTIONS } from "../googleMapsConfig";
import {
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../contexts/UserContext";
import { useToast } from "../contexts/ToastContext";
import { useDrawer, useUserCard } from "../contexts/UserCardContext";
import { useTravelerProfileComplete } from "../hooks/useTravelerProfileComplete";
import { abbreviateLocation } from "../utils/location";
import RequestShipment from "./RequestShipment";
import StarRatingWidget from "./ui/StarRating";

function haversineKm(a, b) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function StarRating({ value, count }) {
    return (
        <span className="star-rating">
            <span className="star-rating__widget">
                <StarRatingWidget rating={value} />
            </span>
            <span className="star-rating__label">
                {value.toFixed(1)} · {count} opinión{count !== 1 ? "es" : ""}
            </span>
        </span>
    );
}

export default function TripDetail({ viaje, pasajeros }) {
    const { isLoaded } = useJsApiLoader(MAP_LOADER_OPTIONS);
    const { usuario } = useUser();
    const toast = useToast();
    const { closeDrawer } = useDrawer();
    const { openCard } = useUserCard();
    const { loading: loadingProfile, canReserve } = useTravelerProfileComplete(usuario?.uid);

    const [directions, setDirections]           = useState(null);
    const [distanciaKm, setDistanciaKm]         = useState(null);
    const [rutaError, setRutaError]             = useState(null);
    const [datosConductor, setDatosConductor]   = useState(null);
    const [vehiculo, setVehiculo]               = useState(null);
    const [reputacion, setReputacion]           = useState(null);
    const [totalOpiniones, setTotalOpiniones]   = useState(0);
    const [reservando, setReservando]           = useState(false);
    const [abrirEnvio, setAbrirEnvio]           = useState(false);

    // Route and distance calculation
    useEffect(() => {
        if (!isLoaded || !viaje) return;
        const { origenCoords, destinoCoords, origen, destino } = viaje;
        const service = new window.google.maps.DirectionsService();
        const req = (orig, dest) =>
            new Promise((resolve) =>
                service.route(
                    { origin: orig, destination: dest, travelMode: window.google.maps.TravelMode.DRIVING },
                    (res, status) => resolve({ res, status })
                )
            );

        if (origenCoords && destinoCoords) {
            const oLL = new window.google.maps.LatLng(origenCoords.lat, origenCoords.lng);
            const dLL = new window.google.maps.LatLng(destinoCoords.lat, destinoCoords.lng);
            req(oLL, dLL).then(({ res, status }) => {
                if (status === "OK" && res.routes?.length) {
                    setDirections(res);
                    setDistanciaKm((res.routes[0].legs[0].distance.value / 1000).toFixed(1));
                } else {
                    req(origen, destino).then(({ res: r2, status: s2 }) => {
                        if (s2 === "OK" && r2.routes?.length) {
                            setDirections(r2);
                            setDistanciaKm((r2.routes[0].legs[0].distance.value / 1000).toFixed(1));
                        } else if (origenCoords && destinoCoords) {
                            setDistanciaKm(haversineKm(origenCoords, destinoCoords).toFixed(1));
                            setRutaError("Distancia en línea recta (ruta no disponible).");
                        }
                    });
                }
            });
        } else {
            setRutaError("Sin coordenadas guardadas para este viaje.");
        }
    }, [isLoaded, viaje]);

    // Fetch driver and vehicle data
    useEffect(() => {
        if (!viaje?.conductor?.uid) return;
        const fetchDatos = async () => {
            const snap = await getDoc(doc(db, "usuarios", viaje.conductor.uid));
            if (snap.exists()) setDatosConductor(snap.data());

            try {
                const vehSnap = await getDocs(collection(db, "usuarios", viaje.conductor.uid, "vehiculos"));
                if (!vehSnap.empty) setVehiculo(vehSnap.docs[0].data());
            } catch {}

            try {
                const calSnap = await getDocs(collection(db, "usuarios", viaje.conductor.uid, "calificaciones"));
                const notas = calSnap.docs.map(d => d.data()?.puntuacion).filter(n => typeof n === "number");
                if (notas.length) {
                    setReputacion(notas.reduce((a, b) => a + b, 0) / notas.length);
                    setTotalOpiniones(notas.length);
                }
            } catch {}
        };
        fetchDatos();
    }, [viaje?.conductor?.uid]);

    if (!viaje) return null;

    const center = viaje.origenCoords || { lat: -34.6, lng: -58.38 };
    const precio = distanciaKm ? Math.round(distanciaKm * 70) : null;

    const handleConfirmarReserva = async () => {
        if (!usuario?.uid) { toast.error("Iniciá sesión para reservar."); return; }
        if (loadingProfile)  { toast.info("Esperá un momento, cargando tu perfil…"); return; }
        if (!canReserve)     { toast.error("Completá tu perfil antes de reservar."); return; }
        if (!viaje.id)       { toast.error("Error interno: viaje sin ID."); return; }

        setReservando(true);
        try {
            await addDoc(collection(db, "viajes", viaje.id, "reservas"), {
                viajanteUid:        usuario.uid,
                fechaReserva:       serverTimestamp(),
                cantidadPasajeros:  pasajeros || 1,
                estadoReserva:      "pendiente",
                creadoPor:          usuario.uid,
            });
            toast.success("¡Reserva creada! El conductor confirmará pronto.");
            closeDrawer();
        } catch (e) {
            toast.error(
                e.code === "permission-denied"
                    ? "Sin permiso para reservar en este viaje."
                    : "Error al reservar. Intentá de nuevo."
            );
        } finally {
            setReservando(false);
        }
    };

    return (
        <div className="ucs-content trip-detail-content">

                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "240px", borderRadius: "var(--radius-md)" }}
                        center={center}
                        zoom={8}
                    >
                        {directions
                            ? <DirectionsRenderer directions={directions} />
                            : <Marker position={center} />
                        }
                    </GoogleMap>
                ) : (
                    <div className="route-map-placeholder">
                        <MapPin size={24} />
                        <span>Cargando mapa…</span>
                    </div>
                )}

                {rutaError && (
                    <p className="trip-detail-route-note">{rutaError}</p>
                )}

                <div className="trip-detail-info">
                    <p><strong>Origen:</strong> {abbreviateLocation(viaje.origen)}</p>
                    <p><strong>Destino:</strong> {abbreviateLocation(viaje.destino)}</p>
                    <p><strong>Horario:</strong> {viaje.horario}</p>
                    <p><strong>Asientos:</strong> {viaje.asientos}</p>
                    {distanciaKm && <p><strong>Distancia:</strong> {distanciaKm} km</p>}
                    {precio      && <p><strong>Precio estimado:</strong> ${precio.toLocaleString("es-AR")}</p>}

                    {viaje.aceptaPaquetes && (
                        <div className="trip-detail-packages">
                            <Package size={13} />
                            <span>Acepta paquetes</span>
                            {viaje.pesoMax    && <span>· {viaje.pesoMax} kg máx</span>}
                            {viaje.volumenMax && <span>· {viaje.volumenMax} L máx</span>}
                            {viaje.costoBasePaquete != null && (
                                <span>· Desde ${Number(viaje.costoBasePaquete).toLocaleString("es-AR")}</span>
                            )}
                        </div>
                    )}
                </div>

                {(datosConductor || vehiculo) && <hr className="trip-detail-divider" />}

                {/* Driver row — taps open their profile card in the same sheet */}
                {datosConductor && viaje.conductor?.uid && (
                    <button
                        className="trip-detail-driver-row"
                        onClick={() => openCard(viaje.conductor.uid, "conductor")}
                    >
                        <div className="trip-detail-driver-row__avatar">
                            {(datosConductor.fotoURL || datosConductor.fotoPerfil)
                                ? <img src={datosConductor.fotoURL || datosConductor.fotoPerfil} alt={datosConductor.nombre} />
                                : <span>{(datosConductor.nombre || "C")[0].toUpperCase()}</span>
                            }
                        </div>
                        <div className="trip-detail-driver-row__info">
                            <span className="trip-detail-driver-row__name">
                                {datosConductor.nombre || "Conductor"}
                            </span>
                            {reputacion !== null
                                ? <StarRating value={reputacion} count={totalOpiniones} />
                                : <span className="trip-detail-driver-row__no-rating">Sin calificaciones aún</span>
                            }
                        </div>
                        <ChevronRight size={16} className="trip-detail-driver-row__chevron" />
                    </button>
                )}

                {/* Vehicle accordion — year in title, photo full-bleed, no plate */}
                {vehiculo && (
                    <details className="trip-detail-accordion">
                        <summary>
                            <Truck size={14} />
                            {[vehiculo.brand, vehiculo.model].filter(Boolean).join(" ") || "Vehículo"}
                            {vehiculo.year && <span className="trip-detail-vehicle-year"> — {vehiculo.year}</span>}
                        </summary>
                        {vehiculo.photoUrl
                            ? <img src={vehiculo.photoUrl} alt="Foto del vehículo" className="trip-detail-vehicle-img" />
                            : <div className="trip-detail-accordion__body">
                                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Sin foto</span>
                              </div>
                        }
                    </details>
                )}

                <div className="trip-detail-actions">
                    <button
                        className="button"
                        onClick={handleConfirmarReserva}
                        disabled={reservando || viaje.asientos < 1}
                    >
                        {reservando ? "Reservando…" : viaje.asientos > 0 ? "Confirmar reserva" : "Sin asientos"}
                    </button>

                    {viaje.aceptaPaquetes && (
                        <button
                            className="button"
                            style={{ backgroundColor: "var(--color-info)" }}
                            onClick={() => setAbrirEnvio(true)}
                        >
                            <Package size={14} />
                            Solicitar envío
                        </button>
                    )}
                </div>

            {abrirEnvio && (
                <RequestShipment
                    viaje={viaje}
                    usuario={usuario}
                    onClose={() => setAbrirEnvio(false)}
                    onCreated={() => setAbrirEnvio(false)}
                />
            )}
        </div>
    );
}
