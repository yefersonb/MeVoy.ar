import { useState } from "react";
import { MapPin } from "react-feather";
import StarPicker from "./ui/StarPicker";
import { useToast } from "../contexts/ToastContext";
import { useDrawer } from "../contexts/UserCardContext";

// Default categories for a passenger rating a driver after a trip.
// Callers can pass their own `categories` array for other contexts.
const DEFAULT_CATEGORIES = [
    { key: "conduccion",  label: "Conducción" },
    { key: "puntualidad", label: "Puntualidad" },
    { key: "amabilidad",  label: "Amabilidad" },
    { key: "estadoAuto",  label: "Estado del auto" },
];

// ─── Trip rating sheet content ────────────────────────────────────────────────
//
// Usage:
//   const { openDrawer } = useDrawer();
//   openDrawer(
//     <TripRatingSheet trip={trip} onSubmit={handleRate} />,
//     "Calificar viaje"
//   );
//
// Optional props:
//   categories  — array of { key, label } to rate. Defaults to DEFAULT_CATEGORIES.
//   onSubmit    — async ({ ratings, comment }) => void

export default function TripRatingSheet({ trip, categories = DEFAULT_CATEGORIES, onSubmit }) {
    const [ratings, setRatings] = useState({});   // { [key]: 1–5 }
    const [comment, setComment] = useState("");
    const [busy, setBusy]       = useState(false);
    const toast                 = useToast();
    const { closeDrawer }       = useDrawer();

    const setRating = (key, value) =>
        setRatings(prev => ({ ...prev, [key]: value }));

    const ratedCount  = Object.keys(ratings).length;
    const canSubmit   = !busy && ratedCount > 0;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setBusy(true);
        try {
            // TODO: Wire to Firestore — aggregate ratings into usuarios/{driverUid}.valoraciones
            //       and write the full submission to viajes/{tripId}/ratings/{uid}
            await onSubmit?.({ ratings, comment: comment.trim() || null });
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

            {/* One StarPicker per category */}
            <div className="trip-rating__categories">
                {categories.map(cat => (
                    <StarPicker
                        key={cat.key}
                        size="sm"
                        label={cat.label}
                        value={ratings[cat.key] || 0}
                        onChange={v => setRating(cat.key, v)}
                    />
                ))}
            </div>

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
