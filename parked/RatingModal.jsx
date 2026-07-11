import { useState } from "react";
import { X, Star } from "react-feather";
import "../styles/simulator.css";

// Simple single-score rating modal. For multi-category ratings,
// use TripRatingSheet inside a drawer via useDrawer() instead.
export default function RatingModal({ isOpen, onClose, onSubmit }) {
    const [rating, setRating]   = useState(0);
    const [hover, setHover]     = useState(0);
    const [comment, setComment] = useState("");

    if (!isOpen) return null;

    const handleSend = () => {
        if (rating === 0) return;
        onSubmit?.({ rating, comment: comment.trim() || null });
        setRating(0);
        setComment("");
        onClose?.();
    };

    return (
        <div
            className="sim-overlay"
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
        >
            <div className="sim-modal">
                <div className="sim-modal__header">
                    <Star size={16} className="sim-modal__header-icon" />
                    <span className="sim-modal__header-title">Calificá tu viaje</span>
                    <button className="sim-modal__close" onClick={onClose} aria-label="Cerrar">
                        <X size={16} />
                    </button>
                </div>

                <div className="sim-modal__body">
                    {/* Star row */}
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "8px 0" }}>
                        {[1, 2, 3, 4, 5].map((v) => (
                            <button
                                key={v}
                                onClick={() => setRating(v)}
                                onMouseEnter={() => setHover(v)}
                                onMouseLeave={() => setHover(0)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 2,
                                    color: v <= (hover || rating) ? "var(--color-warning, #f5a623)" : "var(--color-border, #ccc)",
                                    fontSize: "2rem",
                                    lineHeight: 1,
                                    transition: "color 0.1s",
                                }}
                                aria-label={`${v} estrella${v !== 1 ? "s" : ""}`}
                            >
                                ★
                            </button>
                        ))}
                    </div>

                    <textarea
                        className="trip-rating__comment"
                        placeholder="Comentario opcional…"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        maxLength={400}
                    />

                    <div className="sim-modal__actions">
                        <button className="button neutral" onClick={onClose} style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button
                            className="button"
                            onClick={handleSend}
                            disabled={rating === 0}
                            style={{ flex: 1 }}
                        >
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
