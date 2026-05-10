import React from "react";

export default function Toggle({ checked, onChange, label }) {
    return (
        <label className={`toggle${checked ? " toggle--on" : ""}`}>
            <span className="toggle__track" />
            {label && <span>{label}</span>}
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
            />
        </label>
    );
}
