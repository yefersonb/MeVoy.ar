import React, { useState, useEffect } from "react";
import {
    collection, query, orderBy, onSnapshot, getDoc,
    doc, updateDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { Calendar, Clock, Users, MapPin, CreditCard, X, Star } from "react-feather";
import { db, auth } from "../firebase";
import { abbreviateLocation } from "../utils/location";
import { sendNotification, NOTIF_TYPES } from "../utils/notifications";
import { submitRating } from "../utils/submitRating";
import Spinner from "./common/Spinner";
import { useUserCard, useDrawer } from "../contexts/UserCardContext";
import { useToast } from "../contexts/ToastContext";
import SimulatorCheckoutModal from "./SimulatorCheckoutModal";
import TripRatingSheet from "./TripRatingSheet";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    // legacy — backward compat with existing Firestore docs
    pendiente:       { label: "Solicitud enviada",      cls: "booking-status--pending",    hint: "Esperá la respuesta del conductor." },
    // current
    requested:       { label: "Solicitud enviada",      cls: "booking-status--pending",    hint: "Esperá la respuesta del conductor." },
    accepted:        { label: "¡Aceptado!",             cls: "booking-status--accepted",   hint: "El conductor aceptó. Confirmá para asegurar tu lugar." },
    confirmed:       { label: "Reserva confirmada",     cls: "booking-status--confirmed",  hint: "Tu lugar está asegurado. ¡Buen viaje!" },
    in_transit:      { label: "En viaje",               cls: "booking-status--in-transit", hint: null },
    completed:       { label: "Viaje finalizado",       cls: "booking-status--done",       hint: null },
    rejected:        { label: "Rechazada",              cls: "booking-status--rejected",   hint: "El conductor no pudo aceptar tu solicitud." },
    cancelled:       { label: "Cancelada",              cls: "booking-status--rejected",   hint: null },
    payment_failed:  { label: "Pago rechazado",         cls: "booking-status--rejected",   hint: "El pago no fue aprobado. Podés intentarlo de nuevo." },
};

function statusInfo(status) {
    return STATUS_CONFIG[status] ?? { label: status ?? "—", cls: "", hint: null };
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ reserva, trip }) {
    const { openCard }   = useUserCard();
    const { openDrawer } = useDrawer();
    const toast          = useToast();

    const [busy, setBusy]               = useState(false);
    const [showSimulator, setShowSimulator] = useState(false);

    const status     = reserva.estadoReserva || "requested";
    const { label, cls, hint } = statusInfo(status);

    const conductorUid = typeof trip?.conductor === "string"
        ? trip.conductor
        : (trip?.conductor?.uid || trip?.conductorUid || null);

    const tripDate = trip?.horario?.toDate?.()
        ?? (trip?.fecha ? new Date(trip.fecha) : null);

    // ── Firestore transition helper ──
    const transitionTo = async (to, { adjustSeats = 0, extraData = {} } = {}) => {
        if (!reserva.viajeId || !reserva.id) { toast.error("Faltan datos de reserva."); return; }
        setBusy(true);
        try {
            await updateDoc(doc(db, "viajes", reserva.viajeId, "reservas", reserva.id), {
                estadoReserva: to,
                ...extraData,
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

    // ── Payment handlers ──
    const handleConfirm = () => {
        setShowSimulator(true);
    };

    const handlePaymentApproved = async (simulatedPaymentId) => {
        setShowSimulator(false);
        await transitionTo("confirmed", {
            extraData: {
                simulatedPaymentId,
                paymentMethod:      "simulator",
                paymentConfirmedAt: serverTimestamp(),
            },
        });
    };

    const handlePaymentRejected = () => {
        setShowSimulator(false);
        toast.error("Pago rechazado. Podés intentarlo de nuevo cuando quieras.");
    };

    const handleCancel = () => {
        const adjustSeats = status === "accepted" ? -(reserva.cantidadPasajeros || 1) : 0;
        transitionTo("cancelled", { adjustSeats });
    };

    // ── Rating handler (post-trip) ──
    const handleOpenRating = () => {
        const driverUid = conductorUid;
        if (!driverUid || !reserva.viajeId) return;

        openDrawer(
            <TripRatingSheet
                trip={trip}
                onSubmit={async ({ rating, comment }) => {
                    await submitRating({
                        raterUid:  auth.currentUser?.uid,
                        targetUid: driverUid,
                        tripId:    reserva.viajeId,
                        rating,
                        comment,
                    });
                }}
            />,
            "Calificar viaje"
        );
    };

    return (
        <>
            {showSimulator && (
                <SimulatorCheckoutModal
                    trip={trip}
                    reservation={reserva}
                    onApprove={handlePaymentApproved}
                    onReject={handlePaymentRejected}
                    onClose={() => setShowSimulator(false)}
                />
            )}

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

                {/* Accepted → show payment button */}
                {(status === "accepted" || status === "payment_failed") && (
                    <div className="passenger-card__actions">
                        <button className="button" onClick={handleConfirm} disabled={busy}>
                            <CreditCard size={14} />
                            {status === "payment_failed" ? "Reintentar pago" : "Confirmar y pagar"}
                        </button>
                        <button className="button neutral" onClick={handleCancel} disabled={busy}>
                            <X size={14} /> Cancelar
                        </button>
                    </div>
                )}

                {/* Pending → allow cancellation only */}
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

                {/* Completed → offer rating */}
                {status === "completed" && conductorUid && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                            className="button neutral"
                            style={{ padding: "6px 10px", fontSize: "var(--text-sm)" }}
                            onClick={handleOpenRating}
                        >
                            <Star size={13} /> Calificar viaje
                        </button>
                    </div>
                )}
            </li>
        </>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function TravelerDashboard({ usuario }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);

    useEffect(() => {
        if (!usuario?.uid) return;

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
