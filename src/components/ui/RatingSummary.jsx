import React from "react";
import Stars from "./StarRating";

// Shared rating display — one place for the ratingTotal/ratingCount → average
// math and its star widget, instead of every profile/trip surface computing
// and rendering it slightly differently.
export default function RatingSummary({ ratingCount = 0, ratingTotal = 0, uid, label }) {
    if (!ratingCount) {
        return <span className="rating-summary rating-summary--empty">Sin calificaciones aún</span>;
    }

    const avg = ratingTotal / ratingCount;
    const countLabel = label ?? `${ratingCount} calificaci${ratingCount === 1 ? "ón" : "ones"}`;

    return (
        <span className="rating-summary">
            <span className="rating-summary__stars">
                <Stars rating={avg} idPrefix={uid} />
            </span>
            <span className="rating-summary__value">{avg.toFixed(1)}</span>
            <span className="rating-summary__count">({countLabel})</span>
        </span>
    );
}
