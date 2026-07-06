import { useEffect, useMemo, useState } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { MapPin, Trash2, Check, X, Navigation, Flag } from "react-feather";
import { abbreviateLocation } from "../utils/location";
import { useUserCard } from "../contexts/UserCardContext";
import { useToast } from "../contexts/ToastContext";
import { sendNotification, NOTIF_TYPES } from "../utils/notifications";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    // legacy value — backward compat with existing Firestore docs
    pendiente:   { label: "Pendiente",              cls: "booking-status--pending"    },
    // current values
    requested:   { label: "Solicitud recibida",     cls: "booking-status--pending"    },
    accepted:    { label: "Aceptada",               cls: "booking-status--accepted"   },
    confirmed:   { label: "Pago confirmado",        cls: "booking-status--confirmed"  },
    in_transit:  { label: "En viaje",               cls: "booking-status--in-transit" },
    completed:   { label: "Finalizado",             cls: "booking-status--done"       },
    rejected:    { label: "Rechazada",              cls: "booking-status--rejected"   },
    cancelled:   { label: "Cancelada",              cls: "booking-status--rejected"   },
};

function statusChip(status) {
    const s = STATUS_CONFIG[status] ?? { label: status ?? "—", cls: "" };
    return <span className={`booking-status ${s.cls}`}>{s.label}</span>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const passengerUid = (res) =>
    res.uidPasajero || res.pasajeroUid || res.viajanteUid ||
    res.pasajero?.uid || res.pasajero?.userId || null;

function normalize(viajes = [], reservasRaw) {
    if (Array.isArray(reservasRaw)) {
        return reservasRaw.map((r, i) => ({
            ...r,
            key: `${r.viajeId ?? "x"}-${r.id ?? i}`,
            viaje: viajes.find((v) => v.id === r.viajeId),
        }));
    }
    if (reservasRaw && typeof reservasRaw === "object") {
        return Object.entries(reservasRaw).flatMap(([viajeId, arr]) => {
            if (!Array.isArray(arr)) return [];
            return arr.map((r, i) => ({
                ...r,
                key: `${viajeId}-${i}`,
                viajeId,
                viaje: viajes.find((v) => v.id === viajeId),
            }));
        });
    }
    return [];
}

// ─── Reservation card ─────────────────────────────────────────────────────────

function ReservationCard({ res }) {
    const { openCard } = useUserCard();
    const toast = useToast();

    const [profile, setProfile]             = useState(null);
    const [busy, setBusy]                   = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const uid    = passengerUid(res);
    const status = res.estadoReserva || "requested";

    useEffect(() => {
        if (!uid) return;
        getDoc(doc(db, "usuarios", uid))
            .then((snap) => snap.exists() && setProfile(snap.data()))
            .catch(() => {});
    }, [uid]);

    const transitionTo = async (to, { adjustSeats = 0 } = {}) => {
        if (!res.viajeId || !res.id) { toast.error("Faltan datos para actualizar."); return; }
        setBusy(true);
        try {
            await updateDoc(doc(db, "viajes", res.viajeId, "reservas", res.id), {
                estadoReserva: to,
            });
            if (adjustSeats !== 0) {
                await updateDoc(doc(db, "viajes", res.viajeId), {
                    occupiedSeats: increment(adjustSeats),
                });
            }

            const recipientUid = passengerUid(res);
            const driverName   = auth.currentUser?.displayName || "El conductor";
            const destination  = res.viaje?.destino ? abbreviateLocation(res.viaje.destino) : "destino";

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
                    tripId:        res.viajeId,
                    reservationId: res.id,
                });
            }

            const toastLabels = {
                accepted:   "Reserva aceptada.",
                rejected:   "Reserva rechazada.",
                in_transit: "Viaje iniciado.",
                completed:  "Viaje finalizado.",
                cancelled:  "Reserva cancelada.",
            };
            toast.success(toastLabels[to] ?? "Estado actualizado.");
        } catch (e) {
            console.error("[IncomingReservations] updateDoc error:", e);
            toast.error("No se pudo actualizar la reserva.");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!res.viajeId || !res.id) return;
        setBusy(true);
        try {
            await deleteDoc(doc(db, "viajes", res.viajeId, "reservas", res.id));
            toast.success("Reserva eliminada.");
        } catch (e) {
            console.error("[IncomingReservations] deleteDoc error:", e);
            toast.error("No se pudo eliminar.");
        } finally {
            setBusy(false);
            setConfirmDelete(false);
        }
    };

    const name     = profile?.nombre || res.pasajeroNombre || res.pasajero?.nombre || "Pasajero";
    const avatar   = profile?.fotoURL || profile?.fotoPerfil || null;
    const tripDate = res.viaje?.horario?.toDate?.()
        ?? (res.fechaReserva?.toDate?.() ?? null);

    const isPending   = status === "requested" || status === "pendiente";
    const isAccepted  = status === "accepted";
    const isConfirmed = status === "confirmed";
    const isInTransit = status === "in_transit";
    const isTerminal  = status === "completed" || status === "rejected" || status === "cancelled";

    return (
        <div className="passenger-card card">
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
                        {tripDate && (
                            <> · {tripDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</>
                        )}
                    </span>
                </div>

                {statusChip(status)}
            </div>

            {res.viaje && (
                <div className="passenger-card__trip">
                    <MapPin size={12} />
                    {abbreviateLocation(res.viaje.origen)} → {abbreviateLocation(res.viaje.destino)}
                </div>
            )}

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
                        onClick={() => transitionTo("rejected")}
                        disabled={busy}
                    >
                        <X size={14} /> Rechazar
                    </button>
                </div>
            )}

            {isAccepted && (
                <p className="passenger-card__state-hint">
                    Esperando confirmación de pago del pasajero.
                </p>
            )}

            {isConfirmed && (
                <div className="passenger-card__actions">
                    <button className="button" onClick={() => transitionTo("in_transit")} disabled={busy}>
                        <Navigation size={14} /> Iniciar viaje
                    </button>
                </div>
            )}

            {isInTransit && (
                <div className="passenger-card__actions">
                    <button
                        className="button"
                        style={{ background: "var(--color-success)" }}
                        onClick={() => transitionTo("completed")}
                        disabled={busy}
                    >
                        <Flag size={14} /> Finalizar viaje
                        {/* TODO: release MP funds from escrow when payment is wired */}
                    </button>
                </div>
            )}

            {isTerminal && (
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
                            className="button neutral"
                            style={{ padding: "6px 10px", border: "none" }}
                            onClick={() => setConfirmDelete(true)}
                            title="Eliminar reserva"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── List ─────────────────────────────────────────────────────────────────────

export default function IncomingReservations({ viajes, reservas }) {
    const list = useMemo(
        () => normalize(viajes ?? [], reservas ?? []),
        [viajes, reservas]
    );

    if (list.length === 0) return null;

    return (
        <ul className="rack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {list.map((res) => (
                <li key={res.key}>
                    <ReservationCard res={res} />
                </li>
            ))}
        </ul>
    );
}
