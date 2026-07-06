import { useEffect, useState } from "react";
import {
    Calendar, Clock, Trash2, Check, X, Navigation, Flag, Star,
} from "react-feather";
import {
    doc, getDoc, updateDoc, deleteDoc, increment,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import Spinner from "./common/Spinner";
import ErrorMessage from "./common/ErrorMessage";
import { abbreviateLocation } from "../utils/location";
import { useUserCard, useDrawer } from "../contexts/UserCardContext";
import { useToast } from "../contexts/ToastContext";
import { sendNotification, NOTIF_TYPES } from "../utils/notifications";
import { submitRating } from "../utils/submitRating";
import TripRatingSheet from "./TripRatingSheet";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    // legacy Spanish values — backward compat with old Firestore docs
    pendiente:      { label: "Pendiente",          cls: "booking-status--pending"    },
    confirmado:     { label: "Aceptada",           cls: "booking-status--confirmed"  },
    aceptado:       { label: "Aceptada",           cls: "booking-status--confirmed"  },
    rechazado:      { label: "Rechazada",          cls: "booking-status--rejected"   },
    cancelado:      { label: "Cancelada",          cls: "booking-status--rejected"   },
    // current English values
    requested:      { label: "Solicitud recibida", cls: "booking-status--pending"    },
    accepted:       { label: "Aceptada",           cls: "booking-status--confirmed"  },
    confirmed:      { label: "Pago confirmado",    cls: "booking-status--confirmed"  },
    in_transit:     { label: "En viaje",           cls: "booking-status--in-transit" },
    completed:      { label: "Finalizado",         cls: "booking-status--done"       },
    rejected:       { label: "Rechazada",          cls: "booking-status--rejected"   },
    cancelled:      { label: "Cancelada",          cls: "booking-status--rejected"   },
    payment_failed: { label: "Pago rechazado",     cls: "booking-status--rejected"   },
};

function statusChip(status) {
    const s = STATUS_CONFIG[status] ?? { label: status ?? "—", cls: "" };
    return <span className={`booking-status ${s.cls}`}>{s.label}</span>;
}

const passengerUid = (res) =>
    res.uidPasajero || res.pasajeroUid || res.viajanteUid ||
    res.pasajero?.uid || res.pasajero?.userId || null;

// ─── Reservation row ──────────────────────────────────────────────────────────

function ReservationRow({ res, trip }) {
    const { openCard }   = useUserCard();
    const { openDrawer } = useDrawer();
    const toast          = useToast();

    const [profile, setProfile]           = useState(null);
    const [busy, setBusy]                 = useState(false);
    const [confirmReject, setConfirmReject] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const uid    = passengerUid(res);
    const status = res.estadoReserva || "requested";
    const viajeId = res.viajeId || trip?.id;

    useEffect(() => {
        if (!uid) return;
        getDoc(doc(db, "usuarios", uid))
            .then((s) => s.exists() && setProfile(s.data()))
            .catch(() => {});
    }, [uid]);

    // ── Firestore transition ──
    const transitionTo = async (to, { adjustSeats = 0 } = {}) => {
        if (!viajeId || !res.id) { toast.error("Faltan datos de la reserva."); return; }
        setBusy(true);
        try {
            await updateDoc(doc(db, "viajes", viajeId, "reservas", res.id), {
                estadoReserva: to,
            });
            if (adjustSeats !== 0) {
                await updateDoc(doc(db, "viajes", viajeId), {
                    occupiedSeats: increment(adjustSeats),
                });
            }

            const recipientUid  = uid;
            const driverName    = auth.currentUser?.displayName || "El conductor";
            const destination   = trip?.destino ? abbreviateLocation(trip.destino) : "destino";
            const seats         = res.cantidadPasajeros || 1;

            const notifMap = {
                accepted:   { type: NOTIF_TYPES.RESERVATION_ACCEPTED, message: `${driverName} aceptó tu solicitud. ¡Confirmá tu lugar para el viaje a ${destination}!` },
                rejected:   { type: NOTIF_TYPES.RESERVATION_REJECTED, message: `${driverName} no pudo aceptar tu solicitud para el viaje a ${destination}.` },
                in_transit: { type: NOTIF_TYPES.TRIP_STARTED,         message: `¡El viaje a ${destination} ha comenzado! Buen viaje.` },
                completed:  { type: NOTIF_TYPES.TRIP_COMPLETED,       message: `El viaje a ${destination} ha finalizado. ¡Gracias por viajar con MeVoy!` },
            };
            if (recipientUid && notifMap[to]) {
                await sendNotification(recipientUid, {
                    ...notifMap[to],
                    fromUid:       auth.currentUser?.uid ?? null,
                    tripId:        viajeId,
                    reservationId: res.id,
                });
            }

            const labels = {
                accepted:   "Reserva aceptada.",
                rejected:   "Reserva rechazada.",
                in_transit: "Viaje iniciado.",
                completed:  "Viaje finalizado.",
                cancelled:  "Reserva cancelada.",
            };
            toast.success(labels[to] ?? "Estado actualizado.");

            // Release payment when trip completes
            if (to === "completed") {
                const { simulatedPaymentId, mpPaymentId } = res;
                fetch("/release_payment", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({
                        simulatedPaymentId: simulatedPaymentId ?? null,
                        mpPaymentId:        mpPaymentId        ?? null,
                        tripId:             viajeId,
                        reservationId:      res.id,
                    }),
                }).catch((e) => console.warn("release_payment call failed:", e));
            }
        } catch (e) {
            console.error("[TripsSection] updateDoc error:", e);
            toast.error("No se pudo actualizar la reserva.");
        } finally {
            setBusy(false);
            setConfirmReject(false);
        }
    };

    const handleDelete = async () => {
        if (!viajeId || !res.id) return;
        setBusy(true);
        try {
            await deleteDoc(doc(db, "viajes", viajeId, "reservas", res.id));
            toast.success("Reserva eliminada.");
        } catch (e) {
            console.error("[TripsSection] deleteDoc error:", e);
            toast.error("No se pudo eliminar.");
        } finally {
            setBusy(false);
            setConfirmDelete(false);
        }
    };

    // ── Rating (driver rates passenger after completion) ──
    const handleOpenRating = () => {
        if (!uid || !viajeId) return;
        openDrawer(
            <TripRatingSheet
                trip={trip}
                categories={[
                    { key: "puntualidad",    label: "Puntualidad" },
                    { key: "comunicacion",   label: "Comunicación" },
                    { key: "respeto",        label: "Respeto" },
                ]}
                onSubmit={async ({ ratings, comment }) => {
                    await submitRating({
                        raterUid:  auth.currentUser?.uid,
                        targetUid: uid,
                        tripId:    viajeId,
                        ratings,
                        comment,
                    });
                }}
            />,
            "Calificar pasajero"
        );
    };

    const name   = profile?.nombre || res.pasajeroNombre || res.pasajero?.nombre || "Pasajero";
    const avatar = profile?.fotoURL || profile?.fotoPerfil || null;

    // Normalise legacy status values so state checks work uniformly
    const isPending    = status === "requested"  || status === "pendiente";
    const isAccepted   = status === "accepted"   || status === "confirmado" || status === "aceptado";
    const isConfirmed  = status === "confirmed";
    const isInTransit  = status === "in_transit";
    const isCompleted  = status === "completed";
    const isTerminal   = isCompleted || status === "rejected" || status === "rechazado" ||
                         status === "cancelled" || status === "cancelado" || status === "payment_failed";

    return (
        <>
            <div className="passenger-card card">
                {/* Who */}
                <div className="passenger-card__who">
                    <button
                        className="passenger-card__avatar"
                        onClick={() => uid && openCard(uid, "viajero")}
                        aria-label={`Ver perfil de ${name}`}
                        disabled={!uid}
                    >
                        {avatar
                            ? <img src={avatar} alt={name} />
                            : <span className="passenger-card__avatar--initial">{name[0]?.toUpperCase()}</span>
                        }
                    </button>

                    <div className="passenger-card__info">
                        <button
                            className="passenger-card__name"
                            onClick={() => uid && openCard(uid, "viajero")}
                            disabled={!uid}
                        >
                            {name}
                        </button>
                        <span className="passenger-card__sub">
                            {res.cantidadPasajeros
                                ? `${res.cantidadPasajeros} pasajero${res.cantidadPasajeros !== 1 ? "s" : ""}`
                                : "1 pasajero"}
                        </span>
                    </div>

                    {statusChip(status)}
                </div>

                {/* Pending → accept / reject */}
                {isPending && (
                    <div className="passenger-card__actions">
                        <button
                            className="button"
                            style={{ background: "var(--color-success)" }}
                            onClick={() => transitionTo("accepted", { adjustSeats: res.cantidadPasajeros || 1 })}
                            disabled={busy}
                        >
                            <Check size={14} /> Aceptar
                        </button>
                        <button
                            className="button"
                            style={{ background: "var(--color-danger)" }}
                            onClick={() => setConfirmReject(true)}
                            disabled={busy}
                        >
                            <X size={14} /> Rechazar
                        </button>
                    </div>
                )}

                {/* Accepted → waiting for passenger payment */}
                {isAccepted && (
                    <p className="passenger-card__state-hint">
                        Esperando confirmación de pago del pasajero.
                    </p>
                )}

                {/* Confirmed (payment done) → start trip */}
                {isConfirmed && (
                    <div className="passenger-card__actions">
                        <button
                            className="button"
                            onClick={() => transitionTo("in_transit")}
                            disabled={busy}
                        >
                            <Navigation size={14} /> Iniciar viaje
                        </button>
                    </div>
                )}

                {/* In transit → finish trip */}
                {isInTransit && (
                    <div className="passenger-card__actions">
                        <button
                            className="button"
                            style={{ background: "var(--color-success)" }}
                            onClick={() => transitionTo("completed")}
                            disabled={busy}
                        >
                            <Flag size={14} /> Finalizar viaje
                        </button>
                    </div>
                )}

                {/* Completed → rate passenger + optional delete */}
                {isCompleted && (
                    <div className="passenger-card__actions" style={{ justifyContent: "space-between" }}>
                        <button
                            className="button neutral"
                            style={{ padding: "6px 10px", fontSize: "var(--text-sm)" }}
                            onClick={handleOpenRating}
                        >
                            <Star size={13} /> Calificar pasajero
                        </button>

                        {confirmDelete ? (
                            <div className="trip-card__delete-confirm">
                                <span>¿Eliminar?</span>
                                <button
                                    className="button"
                                    style={{ background: "var(--color-danger)", padding: "6px 12px", fontSize: "var(--text-sm)" }}
                                    onClick={handleDelete}
                                    disabled={busy}
                                >
                                    Sí
                                </button>
                                <button
                                    className="button neutral"
                                    style={{ padding: "6px 12px", fontSize: "var(--text-sm)" }}
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    No
                                </button>
                            </div>
                        ) : (
                            <button
                                className="button button--icon"
                                onClick={() => setConfirmDelete(true)}
                                title="Eliminar reserva"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* Other terminal states (rejected/cancelled) → delete only */}
                {isTerminal && !isCompleted && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        {confirmDelete ? (
                            <div className="trip-card__delete-confirm">
                                <span>¿Eliminar?</span>
                                <button
                                    className="button"
                                    style={{ background: "var(--color-danger)", padding: "6px 12px", fontSize: "var(--text-sm)" }}
                                    onClick={handleDelete}
                                    disabled={busy}
                                >
                                    Sí
                                </button>
                                <button
                                    className="button neutral"
                                    style={{ padding: "6px 12px", fontSize: "var(--text-sm)" }}
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    No
                                </button>
                            </div>
                        ) : (
                            <button
                                className="button button--icon"
                                onClick={() => setConfirmDelete(true)}
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Reject confirmation */}
            {confirmReject && (
                <div className="confirm-modal-backdrop" onClick={() => setConfirmReject(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <p className="confirm-modal__title">¿Rechazar esta reserva?</p>
                        <p className="confirm-modal__body">
                            Se le notificará a <strong>{name}</strong> que su solicitud fue rechazada.
                        </p>
                        <div className="confirm-modal__actions">
                            <button
                                className="button neutral"
                                onClick={() => setConfirmReject(false)}
                                disabled={busy}
                            >
                                Cancelar
                            </button>
                            <button
                                className="button"
                                style={{ background: "var(--color-danger)" }}
                                onClick={() => transitionTo("rejected")}
                                disabled={busy}
                            >
                                {busy ? "…" : "Sí, rechazar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Trip card with nested reservations ───────────────────────────────────────

function TripCard({ trip, reservations, onDeleteTrip }) {
    const toast = useToast();
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting]     = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onDeleteTrip(trip.id);
        } catch (err) {
            toast.error(err.message || "No se pudo eliminar el viaje.");
        } finally {
            setDeleting(false);
            setConfirming(false);
        }
    };

    const tripDate = trip.horario?.toDate?.()
        ?? (trip.fecha ? new Date(trip.fecha) : null);
    const seats    = trip.asientosTotales ?? trip.asientos;

    const totalReqs  = reservations.length;
    const confirmed  = reservations.filter(r =>
        r.estadoReserva === "confirmed" || r.estadoReserva === "confirmado" || r.estadoReserva === "aceptado"
    ).length;
    const statsLabel = totalReqs === 0
        ? (seats != null ? `${seats} asientos` : null)
        : `${totalReqs} solicitud${totalReqs !== 1 ? "es" : ""} · ${confirmed}/${seats ?? "?"} confirmados`;

    return (
        <li className="trip-card">
            {/* Topbar */}
            <div className="trip-card__topbar">
                {statsLabel && <span className="trip-card__stats">{statsLabel}</span>}
                {confirming ? (
                    <div className="trip-card__delete-confirm">
                        <span>¿Eliminar?</span>
                        <button
                            className="button"
                            style={{ background: "var(--color-danger)", padding: "4px 10px", fontSize: "var(--text-sm)" }}
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? "…" : "Sí"}
                        </button>
                        <button
                            className="button neutral"
                            style={{ padding: "4px 10px", fontSize: "var(--text-sm)" }}
                            onClick={() => setConfirming(false)}
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <button
                        className="button button--icon"
                        onClick={() => setConfirming(true)}
                        title="Eliminar viaje"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Route */}
            <div className="trip-card__route">
                <span className="trip-card__city">{abbreviateLocation(trip.origen ?? "—")}</span>
                <span className="trip-card__arrow">→</span>
                <span className="trip-card__city">{abbreviateLocation(trip.destino ?? "—")}</span>
            </div>

            {/* Meta */}
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
            </div>

            {/* Reservations */}
            {reservations.length > 0 && (
                <div className="trip-card__reservations">
                    {reservations.map((res) => (
                        <ReservationRow
                            key={res.id ?? res.key}
                            res={res}
                            trip={trip}
                        />
                    ))}
                </div>
            )}
        </li>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function TripsSection({
    publishedTrips,
    incomingReservations,
    loading,
    error,
    onLoadData,
    onDeleteTrip,
}) {
    useEffect(() => { onLoadData(); }, [onLoadData]);

    if (loading) return <Spinner />;
    if (error)   return <ErrorMessage error={error} onRetry={onLoadData} />;

    const reservationsForTrip = (tripId) =>
        incomingReservations.filter((r) => r.viajeId === tripId);

    return (
        <div className="rack-s">
            <h2 className="section-title">Mis viajes</h2>
            {publishedTrips.length === 0 ? (
                <div className="bookings-empty">
                    <p>No publicaste ningún viaje todavía.</p>
                    <p className="bookings-empty__hint">
                        Usá <strong>Nuevo</strong> para publicar tu primer viaje.
                    </p>
                </div>
            ) : (
                <ul className="rack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {publishedTrips.map((trip) => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            reservations={reservationsForTrip(trip.id)}
                            onDeleteTrip={onDeleteTrip}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
