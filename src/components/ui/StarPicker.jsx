import { useEffect, useRef, useState } from "react";

const LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

// Maps an X coordinate to a star index 1-5 relative to the container element
function starFromPoint(el, clientX) {
    const rect = el?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(1, Math.min(5, Math.ceil(((clientX - rect.left) / rect.width) * 5)));
}

// size="lg"  — large centered stars + descriptive label, for a single prominent rating
// size="sm"  — compact inline row, for stacking multiple categories
export default function StarPicker({ value = 0, onChange, label, size = "lg" }) {
    const [hovered, setHovered] = useState(0);
    const containerRef = useRef(null);
    const fill = hovered || value;

    // React adds touchmove as passive by default, which blocks preventDefault.
    // We need preventDefault to stop the sheet from scrolling while the user drags.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onMove = (e) => {
            e.preventDefault();
            setHovered(starFromPoint(el, e.touches[0].clientX));
        };

        el.addEventListener("touchmove", onMove, { passive: false });
        return () => el.removeEventListener("touchmove", onMove);
    }, []);

    const handleTouchEnd = (e) => {
        const star = starFromPoint(containerRef.current, e.changedTouches[0].clientX);
        if (star) onChange(star);
        setHovered(0);
    };

    return (
        <div className={`star-picker star-picker--${size}`}>
            {label && <span className="star-picker__title">{label}</span>}

            <div
                ref={containerRef}
                className="star-picker__stars"
                onMouseLeave={() => setHovered(0)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={() => setHovered(0)}
            >
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        type="button"
                        className={`star-picker__star${n <= fill ? " star-picker__star--on" : ""}`}
                        onClick={() => onChange(n)}
                        onMouseEnter={() => setHovered(n)}
                        aria-label={LABELS[n]}
                    >
                        ★
                    </button>
                ))}
            </div>

            {size === "lg" && (
                <span className="star-picker__label">
                    {LABELS[hovered || value] || "Tocá para calificar"}
                </span>
            )}
        </div>
    );
}
