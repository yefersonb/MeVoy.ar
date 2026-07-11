import { useState } from "react";
import { MapPin } from "react-feather";
import StarPicker from "./ui/StarPicker";
import { useToast } from "../contexts/ToastContext";
import { useDrawer } from "../contexts/UserCardContext";

// ─── Trip rating sheet content ────────────────────────────────────────────────
//
// Usage:
//   const { openDrawer } = useDrawer();
//   openDrawer(
//     <TripRatingSheet trip={trip} onSubmit={handleRate} />,
//     "Calificar viaje"
//   );
//
// onSubmit — async ({ rating, comment }) => void

export default function TripRatingSheet({ trip, onSubmit }) {
    const [rating, setRating]   = useState(0);
    const [comment, setComment] = useState("");
    const [busy, setBusy]       = useState(false);
    const toast                 = useToast();
    const { closeDrawer }       = useDrawer();

    const canSubmit = !busy && rating > 0;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setBusy(true);
        try {
            await onSubmit?.({ rating, comment: comment.trim() || null });
            toast.success("¡Gracias por tu valoración!");
            closeDrawer();
        } catch (e) {
            console.error("[TripRatingSheet] submit error:", e);
            toast.error("No se pudo enviar. Intentá de nuevo.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="ucs-content trip-rating">

            {/* Route summary */}
            {trip && (
                <div className="trip-rating__route">
                    <MapPin size={13} className="trip-rating__route-icon" />
                    <span className="trip-rating__origin">{trip.origen}</span>
                    <span className="trip-rating__arrow">→</span>
                    <span className="trip-rating__dest">{trip.destino}</span>
                </div>
            )}

            <StarPicker value={rating} onChange={setRating} />

            {/* Optional comment */}
            <div className="ucs-section">
                <span className="ucs-section__label">Comentario (opcional)</span>
                <textarea
                    className="trip-rating__comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Contanos cómo estuvo el viaje…"
                    rows={3}
                    maxLength={400}
                />
                {comment.length > 300 && (
                    <span className="trip-rating__char-count">
                        {comment.length}/400
                    </span>
                )}
            </div>

            <button
                className="button button--fill"
                onClick={handleSubmit}
                disabled={!canSubmit}
            >
                {busy ? "Enviando…" : "Enviar valoración"}
            </button>

        </div>
    );
}
