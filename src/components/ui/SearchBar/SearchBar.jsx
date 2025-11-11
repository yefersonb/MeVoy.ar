import React from "react";
import { Search } from "react-feather"

export function SearchBar({ value, onChange, placeholder = "Buscar viajes..." }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                margin: 8,
                height: "3rem",
                padding: "0 1rem",
                backgroundColor: "#fff1",
                borderRadius: 9999,
                cursor: "pointer",
                border: "none",
                color: "#fff9"
            }}>
            <input
                style={{ margin: 0, padding: 0, height: "auto", border: "none" }}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            <Search style={{ color: "#fff5" }} />
        </div>
    );
}