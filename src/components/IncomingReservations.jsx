import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { MapPin, Trash2 } from "react-feather";
import { abbreviateLocation } from "../utils/location";
import { useUserCard } from "../contexts/UserCardContext";
import { useToast } from "../contexts/ToastContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const passengerUid = (res) =>
    res.uidPasajero ||
    res.pasajeroUid ||
    res.viajanteUid ||
    res.pasajero?.uid ||
    res.pasajero?.userId ||
    null;

const STATUS_MAP = {
    pendiente:  { label: "Pendiente",  cls: "booking-status--pending"   },
    confirmado: { label: "Confirmada", cls: "booking-status--confirmed"  },
    aceptado:   { label: "Confirmada", cls: "booking-status--confirmed"  },
    rechazado:  { label: "Rechazada",  cls: "booking-status--rejected"   },
    cancelado:  { label: "Cancelada",  cls: "booking-status--rejected"   },
};

function statusChip(estado) {
    const s = STATUS_MAP[estado] ?? { label: estado ?? "—", cls: "" };
    return <span className={`booking-status ${s.cls}`}>{s.label}</span>;
}

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

// ─── Single reservation card ──────────────────────────────────────────────────

function ReservationCard({ res }) {
    const { openCard } = useUserCard();
    const toast = useToast();

    const [profile, setProfile]     = useState(null);
    const [busy, setBusy]           = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const uid = passengerUid(res);

    useEffect(() => {
        if (!uid) return;
        getDoc(doc(db, "usuarios", uid))
            .then((snap) => snap.exists() && setProfile(snap.data()))
            .catch(() => {});
    }, [uid]);

    const handleDecision = async (to) => {
        if (!res.viajeId || !res.id) {
            toast.error("Faltan datos para actualizar la reserva.");
            return;
        }
        setBusy(true);
        try {
            await updateDoc(
                doc(db, "viajes", res.viajeId, "reservas", res.id),
                { estadoReserva: to }
            );
            toast.success(to === "confirmado" ? "Reserva confirmada." : "Reserva rechazada.");
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
            toast.error("No se pudo eliminar la reserva.");
        } finally {
            setBusy(false);
            setConfirmDelete(false);
        }
    };

    const name    = profile?.nombre || res.pasajeroNombre || res.pasajero?.nombre || "Pasajero";
    const avatar  = profile?.fotoURL || profile?.fotoPerfil || null;
    const estado  = res.estadoReserva || "pendiente";
    const tripDate = res.viaje?.horario?.toDate?.()
        ?? (res.fechaReserva?.toDate?.() ?? null);

    const isPending = estado === "pendiente";

    return (
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
                        {tripDate && (
                            <> · {tripDate.toLocaleDateString("es-AR", {
                                day: "numeric", month: "short",
                            })}</>
                        )}
                    </span>
                </div>

                {statusChip(estado)}
            </div>

            {/* Trip route */}
            {res.viaje && (
                <div className="passenger-card__trip">
                    <MapPin size={12} />
                    {abbreviateLocation(res.viaje.origen)} → {abbreviateLocation(res.viaje.destino)}
                </div>
            )}

            {/* Actions */}
            {isPending && (
                <div className="passenger-card__actions">
                    <button
                        className="button"
                        style={{ background: "var(--color-success)" }}
                        onClick={() => handleDecision("confirmado")}
                        disabled={busy}
                    >
                        Confirmar
                    </button>
                    <button
                        className="button"
                        style={{ background: "var(--color-danger)" }}
                        onClick={() => handleDecision("rechazado")}
                        disabled={busy}
                    >
                        Rechazar
                    </button>
                </div>
            )}

            {/* Delete (non-pending reservations) */}
            {!isPending && (
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
                            style={{ padding: "6px 10px" }}
                            onClick={() => setConfirmDelete(true)}
                            title="Eliminar reserva"
                        >
                            <Trash2 size={14} />
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
