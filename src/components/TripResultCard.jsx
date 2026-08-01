import { useEffect, useState } from "react";
import { Calendar, Clock, Users, Package, Truck } from "react-feather";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { availableSeats } from "../utils/tripUtils";
import RatingSummary from "./ui/RatingSummary";
import VerifiedBadge from "./ui/VerifiedBadge";

// One trip result in the passenger-facing search list. Owns its own driver
// rating/verification fetch (same per-row-fetch pattern as ReservationRow in
// TripsSection.jsx) since none of that lives on the `viajes` doc itself.
export default function TripResultCard({ viaje, fechaViaje, onOpen }) {
    const [driver, setDriver]                     = useState(null);
    const [identityVerified, setIdentityVerified] = useState(false);
    const [vehicleVerified, setVehicleVerified]   = useState(false);

    const conductorUid = viaje.conductor?.uid;
    const vehiculoId    = viaje.vehiculo?.id;

    useEffect(() => {
        if (!conductorUid) return;
        let mounted = true;

        getDoc(doc(db, "usuarios", conductorUid))
            .then((snap) => mounted && snap.exists() && setDriver(snap.data()))
            .catch(() => {});

        getDoc(doc(db, "verificaciones", conductorUid))
            .then((snap) => mounted && setIdentityVerified(snap.exists() && snap.data()?.status === "verified"))
            .catch(() => {});

        if (vehiculoId) {
            getDoc(doc(db, "usuarios", conductorUid, "vehiculos", vehiculoId))
                .then((snap) => mounted && setVehicleVerified(snap.exists() && snap.data()?.adminStatus === "verified"))
                .catch(() => {});
        }

        return () => { mounted = false; };
    }, [conductorUid, vehiculoId]);

    return (
        <li className="trip-card">
            <div className="trip-result-card__driver">
                <span className="trip-result-card__driver-name">
                    {viaje.conductor?.nombre || "Conductor"}
                </span>
                {driver && (
                    <RatingSummary
                        ratingCount={driver.ratingCount || 0}
                        ratingTotal={driver.ratingTotal || 0}
                        uid={conductorUid}
                    />
                )}
                {identityVerified && <VerifiedBadge label="Verificado" />}
                {vehicleVerified && <VerifiedBadge icon={Truck} label="Vehículo verificado" />}
            </div>

            <div className="trip-card__route">
                <span className="trip-card__city">{viaje.origen}</span>
                <span className="trip-card__arrow">→</span>
                <span className="trip-card__city">{viaje.destino}</span>
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
                    {availableSeats(viaje)} asiento{availableSeats(viaje) !== 1 ? "s" : ""} libre{availableSeats(viaje) !== 1 ? "s" : ""}
                </span>
            </div>

            {viaje.aceptaPaquetes && (
                <div className="trip-card__packages">
                    <Package size={12} />
                    <span>Acepta paquetes</span>
                    {viaje.pesoMax && <span>· {viaje.pesoMax} kg máx</span>}
                    {viaje.volumenMax && <span>· {viaje.volumenMax} L máx</span>}
                    {viaje.costoBasePaquete != null && (
                        <span>· Desde ${Number(viaje.costoBasePaquete).toLocaleString("es-AR")}</span>
                    )}
                </div>
            )}

            <div className="trip-card__actions">
                <button className="button" onClick={() => onOpen(viaje)}>
                    Ver detalles
                </button>
            </div>
        </li>
    );
}
