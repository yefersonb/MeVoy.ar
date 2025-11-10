// src/components/DetalleViaje.jsx
import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MAP_LIBS, MAP_LOADER_ID } from "../googleMapsConfig";
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
import { usePerfilViajeroCompleto } from "../hooks/usePerfilViajeroCompleto";
import { abreviarUbicacion } from "../utils/ubicacion";

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

export default function DetalleViaje({
  viaje,
  pasajeros,
  onClose,
  onReservar,
  loading: parentLoading,
}) {
  const { isLoaded } = useJsApiLoader({
    id: MAP_LOADER_ID,
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBS,
  });

  const { usuario } = useUser();
  const { perfil, cargando: cargandoPerfil, puedeReservar } = usePerfilViajeroCompleto(usuario?.uid);

  const [directions, setDirections] = useState(null);
  const [distanciaKm, setDistanciaKm] = useState(null);
  const [rutaError, setRutaError] = useState(null);
  const [datosConductor, setDatosConductor] = useState(null);
  const [vehiculo, setVehiculo] = useState(null);
  const [reputacionCalculada, setReputacionCalculada] = useState(null);
  const [totalOpiniones, setTotalOpiniones] = useState(0);
  const [reservando, setReservando] = useState(false);

  // Cálculo de ruta y distancia
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
            } else {
              setDistanciaKm(haversineKm(origenCoords, destinoCoords).toFixed(1));
              setRutaError("ℹ️ Ruta aproximada en línea recta.");
            }
          });
        }
      });
    } else {
      setRutaError("⚠️ No hay coordenadas guardadas para este viaje.");
    }
  }, [isLoaded, viaje]);

  // Carga de datos de conductor, vehículo y calificaciones
  useEffect(() => {
    if (!viaje?.conductor?.uid) return;
    const fetchDatos = async () => {
      const ref = doc(db, "usuarios", viaje.conductor.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setDatosConductor(snap.data());

      try {
        const vehRef = collection(db, "usuarios", viaje.conductor.uid, "vehiculos");
        const vehSnap = await getDocs(vehRef);
        if (!vehSnap.empty) setVehiculo(vehSnap.docs[0].data());
      } catch {}

      try {
        const calRef = collection(db, "usuarios", viaje.conductor.uid, "calificaciones");
        const calSnap = await getDocs(calRef);
        const notas = calSnap.docs.map(d => d.data()?.puntuacion).filter(n => typeof n === "number");
        if (notas.length) {
          const prom = notas.reduce((a,b) => a+b, 0)/notas.length;
          setReputacionCalculada(prom);
          setTotalOpiniones(notas.length);
        }
      } catch {}
    };
    fetchDatos();
  }, [viaje?.conductor?.uid]);

  if (!viaje) return null;

  const center = viaje.origenCoords || { lat: -34.6, lng: -58.38 };
  const precio = distanciaKm ? Math.round(distanciaKm * 70) : null;

  const renderEstrellas = (rep) => {
    const llenas = Math.floor(rep);
    const mitad = rep % 1 >= 0.5;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span>{"⭐".repeat(llenas)}{mitad ? "✬" : ""}</span>
        <span style={{ color: "#888", marginLeft: 4, fontSize: 12 }}>{rep.toFixed(1)} · {totalOpiniones}</span>
      </span>
    );
  };

  const handleConfirmarReserva = async () => {
    if (!usuario?.uid) return alert("Iniciá sesión para reservar.");
    if (cargandoPerfil) return alert("Esperá a que cargue tu perfil.");
    if (!puedeReservar) { alert("Completá tu perfil."); return window.location.href="/perfil-viajero"; }
    if (!viaje.id) return alert("ID de viaje faltante.");

    setReservando(true);
    try {
      await addDoc(collection(db, "viajes", viaje.id, "reservas"), {
        viajanteUid: usuario.uid,
        fechaReserva: serverTimestamp(),
        cantidadPasajeros: pasajeros || 1,
        estadoReserva: "pendiente",
        creadoPor: usuario.uid,
      });
      alert("Reserva creada.");
    } catch (e) {
      alert(e.code === "permission-denied" ? "Permiso denegado." : "Error al reservar.");
    } finally {
      setReservando(false);
    }
  };

  return (
    <div className="dv-overlay" onClick={onClose}>
      <div className="dv-modal" onClick={e => e.stopPropagation()}>
        <button className="dv-close" onClick={onClose}>×</button>
        <h2>Detalle de Viaje</h2>

        {isLoaded ? (
          <GoogleMap mapContainerStyle={{width:"100%",height:"300px"}} center={center} zoom={8}>
            {directions ? <DirectionsRenderer directions={directions} /> : <Marker position={center} />}
          </GoogleMap>
        ) : <p>Cargando mapa…</p>}

        {rutaError && <p className="dv-error">{rutaError}</p>}

        <div className="dv-info">
          <p><strong>Origen:</strong> {abreviarUbicacion(viaje.origen)}</p>
          <p><strong>Destino:</strong> {abreviarUbicacion(viaje.destino)}</p>
          <p><strong>Horario:</strong> {viaje.horario}</p>
          <p><strong>Asientos:</strong> {viaje.asientos}</p>
          {distanciaKm && <p><strong>Distancia:</strong> {distanciaKm} km</p>}
          {distanciaKm && <p><strong>Precio:</strong> ${precio}</p>}
        </div>

        {(datosConductor || vehiculo) && <hr />}

        {datosConductor && (
          <div className="dv-info">
            <h3>🧑 Conductor</h3>
            <p><strong>Nombre:</strong> {datosConductor.nombre || "-"}</p>
            {datosConductor.whatsapp && <p><strong>WhatsApp:</strong> {datosConductor.whatsapp}</p>}
            {datosConductor.direccion && <p><strong>Dirección:</strong> {datosConductor.direccion}</p>}
            <p><strong>Reputación:</strong> {reputacionCalculada!==null ? renderEstrellas(reputacionCalculada) : "Sin calificaciones"}</p>
          </div>
        )}

        {vehiculo && (
          <div className="dv-info">
            <h3>🚗 Vehículo</h3>
            <p><strong>Marca:</strong> {vehiculo.marca || "-"}</p>
            <p><strong>Modelo:</strong> {vehiculo.modelo || "-"}</p>
            <p><strong>Año:</strong> {vehiculo.anio || "-"}</p>
            <p><strong>Patente:</strong> {vehiculo.patente || "-"}</p>
          </div>
        )}

        <div className="dv-actions">
          <button onClick={onClose} disabled={parentLoading || reservando}>Volver</button>
          <button onClick={handleConfirmarReserva} disabled={parentLoading||reservando||viaje.asientos<1}>
            {reservando ? "Reservando..." : viaje.asientos>0 ? "Confirmar Reserva" : "Sin asientos"}
          </button>
        </div>
      </div>
    </div>
  );
}
