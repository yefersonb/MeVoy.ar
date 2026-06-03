import { useEffect, useState } from "react";
import { Calendar, Clock, Trash2, Check, X } from "react-feather";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import Spinner from "./common/Spinner";
import ErrorMessage from "./common/ErrorMessage";
import { abbreviateLocation } from "../utils/location";
import { useUserCard } from "../contexts/UserCardContext";
import { useToast } from "../contexts/ToastContext";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CLS = {
    pendiente:  "reservation-row--pending",
    confirmado: "reservation-row--confirmed",
    aceptado:   "reservation-row--confirmed",
    rechazado:  "reservation-row--rejected",
    cancelado:  "reservation-row--cancelado",
};

const passengerUid = (res) =>
    res.uidPasajero || res.pasajeroUid || res.viajanteUid ||
    res.pasajero?.uid || res.pasajero?.userId || null;

// ─── Compact reservation row ──────────────────────────────────────────────────

function ReservationRow({ res, viajeId }) {
    const { openCard } = useUserCard();
    const toast = useToast();
    const [profile, setProfile]       = useState(null);
    const [busy, setBusy]             = useState(false);
    const [rejectPending, setRejectPending] = useState(false);

    const uid    = passengerUid(res);
    const estado = res.estadoReserva || "pendiente";
    const cls    = STATUS_CLS[estado] ?? "reservation-row--pending";

    useEffect(() => {
        if (!uid) return;
        getDoc(doc(db, "usuarios", uid))
            .then((s) => s.exists() && setProfile(s.data()))
            .catch(() => {});
    }, [uid]);

    const decide = async (to) => {
        if (!viajeId || !res.id) { toast.error("Faltan datos de la reserva."); return; }
        setBusy(true);
        try {
            await updateDoc(doc(db, "viajes", viajeId, "reservas", res.id), { estadoReserva: to });
            toast.success(to === "confirmado" ? "Reserva confirmada." : "Reserva rechazada.");
        } catch (e) {
            console.error(e);
            toast.error("No se pudo actualizar la reserva.");
        } finally {
            setBusy(false);
            setRejectPending(false);
        }
    };

    const name   = profile?.nombre || res.pasajeroNombre || res.pasajero?.nombre || "Pasajero";
    const avatar = profile?.fotoURL || profile?.fotoPerfil || null;
    const isPending   = estado === "pendiente";
    const isConfirmed = estado === "confirmado" || estado === "aceptado";
    const isRejected  = estado === "rechazado"  || estado === "cancelado";

    return (
        <>
            <div className={`reservation-row ${cls}`}>
                {/* Avatar */}
                <button
                    className="reservation-row__avatar"
                    onClick={() => uid && openCard(uid, "viajero")}
                    disabled={!uid}
                    aria-label={`Ver perfil de ${name}`}
                >
                    {avatar
                        ? <img src={avatar} alt={name} />
                        : <span className="reservation-row__initial">{name[0]?.toUpperCase()}</span>
                    }
                </button>

                {/* Name + status — grouped left */}
                <div className="reservation-row__identity">
                    <button
                        className="reservation-row__name"
                        onClick={() => uid && openCard(uid, "viajero")}
                    >
                        {name}
                    </button>

                    {/* Confirmed: plain quiet label. Pending/Rejected: pill chip */}
                    {isConfirmed ? (
                        <span className="reservation-row__status--quiet">· Confirmada</span>
                    ) : (
                        <span className={`booking-status ${
                            isPending  ? "booking-status--pending"  :
                            isRejected ? "booking-status--rejected" : ""
                        }`}>
                            {isPending ? "Pendiente" : "Rechazada"}
                        </span>
                    )}
                </div>

                {/* Actions — only for pending */}
                {isPending && (
                    <div className="reservation-row__actions">
                        <button
                            className="reservation-row__btn reservation-row__btn--confirm"
                            onClick={() => decide("confirmado")}
                            disabled={busy}
                            title="Confirmar"
                        >
                            <Check size={14} />
                        </button>
                        <button
                            className="reservation-row__btn reservation-row__btn--reject"
                            onClick={() => setRejectPending(true)}
                            disabled={busy}
                            title="Rechazar"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Reject confirmation modal */}
            {rejectPending && (
                <div className="confirm-modal-backdrop" onClick={() => setRejectPending(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <p className="confirm-modal__title">¿Rechazar esta reserva?</p>
                        <p className="confirm-modal__body">
                            Se le notificará a <strong>{name}</strong> que su reserva fue rechazada.
                        </p>
                        <div className="confirm-modal__actions">
                            <button
                                className="button neutral"
                                onClick={() => setRejectPending(false)}
                                disabled={busy}
                            >
                                Cancelar
                            </button>
                            <button
                                className="button"
                                style={{ background: "var(--color-danger)" }}
                                onClick={() => decide("rechazado")}
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

function TripCard({ viaje, reservas, onDelete }) {
    const toast = useToast();
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting]     = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onDelete(viaje.id);
        } catch (err) {
            toast.error(err.message || "No se pudo eliminar el viaje.");
        } finally {
            setDeleting(false);
            setConfirming(false);
        }
    };

    const tripDate = viaje.horario?.toDate?.()
        ?? (viaje.fecha ? new Date(viaje.fecha) : null);
    const seats    = viaje.asientosTotales ?? viaje.asientos;

    const totalReqs     = reservas.length;
    const confirmed     = reservas.filter(r =>
        r.estadoReserva === "confirmado" || r.estadoReserva === "aceptado"
    ).length;
    const statsLabel    = totalReqs === 0
        ? (seats != null ? `${seats} asientos` : null)
        : `${totalReqs} solicitud${totalReqs !== 1 ? "es" : ""} · ${confirmed}/${seats ?? "?"} confirmados`;

    return (
        <li className="trip-card">
            {/* Topbar: stats + delete */}
            <div className="trip-card__topbar">
                {statsLabel && (
                    <span className="trip-card__stats">{statsLabel}</span>
                )}
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
                        className="button neutral"
                        style={{ padding: "5px 8px" }}
                        onClick={() => setConfirming(true)}
                        title="Eliminar viaje"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            {/* Route */}
            <div className="trip-card__route">
                <span className="trip-card__city">
                    {abbreviateLocation(viaje.origen ?? "—")}
                </span>
                <span className="trip-card__arrow">→</span>
                <span className="trip-card__city">
                    {abbreviateLocation(viaje.destino ?? "—")}
                </span>
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

            {/* Nested reservation rows */}
            {reservas.length > 0 && (
                <div className="trip-card__reservations">
                    {reservas.map((res) => (
                        <ReservationRow
                            key={res.id ?? res.key}
                            res={res}
                            viajeId={viaje.id}
                        />
                    ))}
                </div>
            )}
        </li>
    );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function TripsSection({
    viajesPublicados,
    reservasRecibidas,
    loading,
    error,
    onLoadData,
    onEliminarViaje,
}) {
    useEffect(() => { onLoadData(); }, [onLoadData]);

    if (loading) return <Spinner />;
    if (error)   return <ErrorMessage error={error} onRetry={onLoadData} />;

    const reservasByTrip = (viajeId) =>
        reservasRecibidas.filter((r) => r.viajeId === viajeId);

    return (
        <div className="rack-s">
            <h2 className="section-title">Mis viajes</h2>
            {viajesPublicados.length === 0 ? (
                <div className="bookings-empty">
                    <p>No publicaste ningún viaje todavía.</p>
                    <p className="bookings-empty__hint">
                        Usá <strong>Nuevo</strong> para publicar tu primer viaje.
                    </p>
                </div>
            ) : (
                <ul className="rack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {viajesPublicados.map((viaje) => (
                        <TripCard
                            key={viaje.id}
                            viaje={viaje}
                            reservas={reservasByTrip(viaje.id)}
                            onDelete={onEliminarViaje}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
