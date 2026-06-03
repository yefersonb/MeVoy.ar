import React, { useEffect, useState } from "react";
import { Calendar, Clock, Users, Trash2 } from "react-feather";
import IncomingReservations from "./IncomingReservations";
import Spinner from "./common/Spinner";
import ErrorMessage from "./common/ErrorMessage";
import { abbreviateLocation } from "../utils/location";
import { useToast } from "../contexts/ToastContext";

// Inline delete confirmation — no window.confirm needed
function TripCard({ viaje, reservasCount, onDelete }) {
    const toast = useToast();
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

    const seats = viaje.asientosTotales ?? viaje.asientos;
    const hasBooking = reservasCount > 0;

    return (
        <li className="trip-card">
            <div className="trip-card__route">
                <span className="trip-card__city">
                    {abbreviateLocation(viaje.origen ?? "—")}
                </span>
                <span className="trip-card__arrow">→</span>
                <span className="trip-card__city">
                    {abbreviateLocation(viaje.destino ?? "—")}
                </span>
                <span className={`booking-status ${hasBooking
                    ? "booking-status--confirmed"
                    : "booking-status--pending"}`}
                >
                    {hasBooking
                        ? `${reservasCount} reserva${reservasCount !== 1 ? "s" : ""}`
                        : "Disponible"}
                </span>
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
                {seats != null && (
                    <span className="trip-card__meta-item">
                        <Users size={12} />
                        {seats} asiento{seats !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {/* Delete — inline confirm instead of window.confirm */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {confirming ? (
                    <div className="trip-card__delete-confirm">
                        <span>¿Eliminar este viaje?</span>
                        <button
                            className="button"
                            style={{ background: "var(--color-danger)", padding: "6px 14px", fontSize: "var(--text-sm)" }}
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? "…" : "Sí, eliminar"}
                        </button>
                        <button
                            className="button neutral"
                            style={{ padding: "6px 14px", fontSize: "var(--text-sm)" }}
                            onClick={() => setConfirming(false)}
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirming(true)}
                        className="button neutral"
                        style={{ padding: "6px 10px" }}
                        title="Eliminar viaje"
                    >
                        <Trash2 size={15} />
                    </button>
                )}
            </div>
        </li>
    );
}

export default function TripsSection({
    viajesPublicados,
    reservasRecibidas,
    loading,
    error,
    onLoadData,
    onEliminarViaje,
}) {
    useEffect(() => {
        onLoadData();
    }, [onLoadData]);

    if (loading) return <Spinner />;
    if (error)   return <ErrorMessage error={error} onRetry={onLoadData} />;

    const reservasPorViaje = (viajeId) =>
        reservasRecibidas.filter((r) => r.viajeId === viajeId).length;

    return (
        <div className="rack-l">
            <section className="rack-s">
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
                                reservasCount={reservasPorViaje(viaje.id)}
                                onDelete={onEliminarViaje}
                            />
                        ))}
                    </ul>
                )}
            </section>

            <section className="rack-s">
                <h2 className="section-title">Reservas recibidas</h2>
                {reservasRecibidas.length === 0 ? (
                    <div className="bookings-empty">
                        <p>Todavía no recibiste reservas.</p>
                    </div>
                ) : (
                    <IncomingReservations
                        viajes={viajesPublicados}
                        reservas={reservasRecibidas}
                    />
                )}
            </section>
        </div>
    );
}
