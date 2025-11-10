import React from "react";
import Stars from "./ui/StarRating"

export default function RatingRow({ label, value }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px" }} className="rating-row">
            <div style={{ fontSize: "0.85rem" }}>{label}</div>
            <div style={{display: "flex", gap: 8}}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{value.toFixed(1)}</div>
                <div style={{ height: "1rem" }}>
                    <Stars rating={value.toFixed(1)} />
                </div>
            </div>
        </div>
    );
}