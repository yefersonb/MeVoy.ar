import React, { useState, useEffect } from "react";
import {
    collection, query, orderBy, onSnapshot, getDoc,
    doc, updateDoc, increment,
} from "firebase/firestore";
import { Calendar, Clock, Users, MapPin, CreditCard, X } from "react-feather";
import { db, auth } from "../firebase";
import { abbreviateLocation } from "../utils/location";
import { sendNotification, NOTIF_TYPES } from "../utils/notifications";
import Spinner from "./common/Spinner";
import { useUserCard } from "../contexts/UserCardContext";
import { useToast } from "../contexts/ToastContext";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    // legacy — backward compat with existing Firestore docs
    pendiente:   { label: "Solicitud enviada",      cls: "booking-status--pending",    hint: "Esperá la respuesta del conductor." },
    // current
    requested:   { label: "Solicitud enviada",      cls: "booking-status--pending",    hint: "Esperá la respuesta del conductor." },
    accepted:    { label: "¡Aceptado!",             cls: "booking-status--accepted",   hint: "El conductor aceptó. Confirmá para asegurar tu lugar." },
    confirmed:   { label: "Reserva confirmada",     cls: "booking-status--confirmed",  hint: "Tu lugar está asegurado. ¡Buen viaje!" },
    in_transit:  { label: "En viaje",               cls: "booking-status--in-transit", hint: null },
    completed:   { label: "Viaje finalizado",       cls: "booking-status--done",       hint: null },
    rejected:    { label: "Rechazada",              cls: "booking-status--rejected",   hint: "El conductor no pudo aceptar tu solicitud." },
    cancelled:   { label: "Cancelada",              cls: "booking-status--rejected",   hint: null },
};

function statusInfo(status) {
    return STATUS_CONFIG[status] ?? { label: status ?? "—", cls: "", hint: null };
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ reserva, trip }) {
    const { openCard } = useUserCard();
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const { label, cls, hint } = statusInfo(reserva.estadoReserva);

    const conductorUid = typeof trip?.conductor === "string"
        ? trip.conductor
        : (trip?.conductor?.uid || trip?.conductorUid || null);

    const tripDate = trip?.horario?.toDate?.()
        ?? (trip?.fecha ? new Date(trip.fecha) : null);

    const status = reserva.estadoReserva || "requested";

    const transitionTo = async (to, { adjustSeats = 0 } = {}) => {
        if (!reserva.viajeId || !reserva.id) { toast.error("Faltan datos de reserva."); return; }
        setBusy(true);
        try {
            await updateDoc(doc(db, "viajes", reserva.viajeId, "reservas", reserva.id), {
                estadoReserva: to,
            });
            if (adjustSeats !== 0) {
                await updateDoc(doc(db, "viajes", reserva.viajeId), {
                    occupiedSeats: increment(adjustSeats),
                });
            }

            const driverUid     = conductorUid;
            const passengerName = auth.currentUser?.displayName || "El pasajero";
            const destination   = trip?.destino ? abbreviateLocation(trip.destino) : "destino";

            const notifMap = {
                confirmed: { type: NOTIF_TYPES.PAYMENT_CONFIRMED,     message: `${passengerName} confirmó su reserva para el viaje a ${destination}. ¡Listo para viajar!` },
                cancelled: { type: NOTIF_TYPES.RESERVATION_CANCELLED, message: `${passengerName} canceló su reserva para el viaje a ${destination}.` },
            };
            if (driverUid && notifMap[to]) {
                await sendNotification(driverUid, {
                    ...notifMap[to],
                    fromUid:       auth.currentUser?.uid ?? null,
                    tripId:        reserva.viajeId,
                    reservationId: reserva.id,
                });
            }

            const toastLabels = {
                confirmed: "¡Reserva confirmada! Tu lugar está asegurado.",
                cancelled: "Reserva cancelada.",
            };
            if (toastLabels[to]) toast.success(toastLabels[to]);
        } catch (e) {
            console.error("[TravelerDashboard] updateDoc error:", e);
            toast.error("No se pudo actualizar la reserva.");
        } finally {
            setBusy(false);
        }
    };

    const handleConfirm = () => {
        // TODO: trigger MercadoPago payment before transitioning to "confirmed"
        transitionTo("confirmed");
    };

    const handleCancel = () => {
        const adjustSeats = status === "accepted" ? -(reserva.cantidadPasajeros || 1) : 0;
        transitionTo("cancelled", { adjustSeats });
    };

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

            {hint && <p className="booking-card__hint">{hint}</p>}

            {conductorUid && (
                <button
                    className="booking-card__driver"
                    onClick={() => openCard(conductorUid, "conductor")}
                >
                    {trip?.conductor?.nombre
                        ? `Conductor: ${trip.conductor.nombre}`
                        : "Ver perfil del conductor"}
                </button>
            )}

            {status === "accepted" && (
                <div className="passenger-card__actions">
                    <button className="button" onClick={handleConfirm} disabled={busy}>
                        <CreditCard size={14} /> Confirmar y pagar
                        {/* TODO: wire MercadoPago before launch */}
                    </button>
                    <button className="button neutral" onClick={handleCancel} disabled={busy}>
                        <X size={14} /> Cancelar
                    </button>
                </div>
            )}

            {(status === "requested" || status === "pendiente") && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        className="button neutral"
                        style={{ padding: "6px 10px", fontSize: "var(--text-sm)" }}
                        onClick={handleCancel}
                        disabled={busy}
                    >
                        <X size={13} /> Cancelar solicitud
                    </button>
                </div>
            )}
        </li>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function TravelerDashboard({ usuario }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);

    useEffect(() => {
        if (!usuario?.uid) return;

        // Query the user's own reservation-reference subcollection — no collection-group index needed
        const q = query(
            collection(db, "usuarios", usuario.uid, "reservas"),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(
            q,
            async (snap) => {
                const items = await Promise.all(
                    snap.docs.map(async (refDoc) => {
                        const { viajeId } = refDoc.data();
                        const reservaId   = refDoc.id;
                        if (!viajeId) return null;

                        let reserva = null;
                        let trip    = null;
                        try {
                            const rSnap = await getDoc(doc(db, "viajes", viajeId, "reservas", reservaId));
                            if (rSnap.exists()) reserva = { id: rSnap.id, viajeId, ...rSnap.data() };
                        } catch {}
                        try {
                            const tSnap = await getDoc(doc(db, "viajes", viajeId));
                            if (tSnap.exists()) trip = { id: tSnap.id, ...tSnap.data() };
                        } catch {}

                        if (!reserva) return null;
                        return { reserva, trip };
                    })
                );

                setBookings(items.filter(Boolean));
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
