import React, { useState, useEffect } from "react";
import { collectionGroup, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { Calendar, Clock, Users, MapPin } from "react-feather";
import { db } from "../firebase";
import { abbreviateLocation } from "../utils/location";
import Spinner from "./common/Spinner";

const STATUS_MAP = {
    pendiente:  { label: "Pendiente",  cls: "booking-status--pending"   },
    confirmado: { label: "Confirmada", cls: "booking-status--confirmed"  },
    rechazado:  { label: "Rechazada",  cls: "booking-status--rejected"   },
    cancelado:  { label: "Cancelada",  cls: "booking-status--rejected"   },
};

function statusInfo(status) {
    return STATUS_MAP[status] ?? { label: status ?? "—", cls: "" };
}

function BookingCard({ reserva, trip }) {
    const { label, cls } = statusInfo(reserva.estadoReserva);

    const tripDate = trip?.horario?.toDate?.()
        ?? (trip?.fecha ? new Date(trip.fecha) : null);

    return (
        <li className="trip-card">
            <div className="trip-card__route">
                <span className="trip-card__city">
                    {abbreviateLocation(trip?.origen ?? "Origen desconocido")}
                </span>
                <span className="trip-card__arrow">→</span>
                <span className="trip-card__city">
                    {abbreviateLocation(trip?.destino ?? "Destino desconocido")}
                </span>
                <span className={`booking-status ${cls}`}>{label}</span>
            </div>

            <div className="trip-card__meta">
                {tripDate && (
                    <>
                        <span className="trip-card__meta-item">
                            <Calendar size={12} />
                            {tripDate.toLocaleDateString("es-AR", {
                                weekday: "short", day: "numeric", month: "short",
                            })}
                        </span>
                        <span className="trip-card__meta-item">
                            <Clock size={12} />
                            {tripDate.toLocaleTimeString("es-AR", {
                                hour: "2-digit", minute: "2-digit",
                            })}
                        </span>
                    </>
                )}
                {reserva.cantidadPasajeros && (
                    <span className="trip-card__meta-item">
                        <Users size={12} />
                        {reserva.cantidadPasajeros}{" "}
                        pasajero{reserva.cantidadPasajeros !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {trip?.conductor?.nombre && (
                <p className="booking-card__driver">
                    Conductor: {trip.conductor.nombre}
                </p>
            )}
        </li>
    );
}

export default function TravelerDashboard({ usuario }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);

    useEffect(() => {
        if (!usuario?.uid) return;

        const q = query(
            collectionGroup(db, "reservas"),
            where("viajanteUid", "==", usuario.uid)
        );

        const unsub = onSnapshot(
            q,
            async (snap) => {
                const items = await Promise.all(
                    snap.docs.map(async (reservaDoc) => {
                        const reserva = { id: reservaDoc.id, ...reservaDoc.data() };
                        let trip = null;
                        try {
                            const tripSnap = await getDoc(reservaDoc.ref.parent.parent);
                            if (tripSnap.exists()) trip = { id: tripSnap.id, ...tripSnap.data() };
                        } catch {}
                        return { reserva, trip };
                    })
                );

                items.sort((a, b) => {
                    const da = a.reserva.fechaReserva?.toDate?.() ?? new Date(0);
                    const db_ = b.reserva.fechaReserva?.toDate?.() ?? new Date(0);
                    return db_ - da;
                });

                setBookings(items);
                setLoading(false);
            },
            (err) => {
                console.error("Error loading reservations:", err);
                setError("No se pudieron cargar las reservas.");
                setLoading(false);
            }
        );

        return unsub;
    }, [usuario?.uid]);

    if (loading) return <div className="spinner-wrap"><Spinner /></div>;

    if (error) return (
        <div className="bookings-empty">
            <MapPin size={36} />
            <p>{error}</p>
        </div>
    );

    if (!bookings.length) return (
        <div className="bookings-empty">
            <MapPin size={36} />
            <p>Todavía no reservaste ningún viaje.</p>
            <p className="bookings-empty__hint">
                Buscá un viaje en la pestaña <strong>Buscar</strong>.
            </p>
        </div>
    );

    return (
        <section className="rack">
            <h2 className="section-title">Mis reservas</h2>
            <ul className="trip-search__results">
                {bookings.map(({ reserva, trip }) => (
                    <BookingCard key={reserva.id} reserva={reserva} trip={trip} />
                ))}
            </ul>
        </section>
    );
}
