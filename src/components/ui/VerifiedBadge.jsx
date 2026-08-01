import React from "react";
import { Shield } from "react-feather";

// Shared verification pill — identity, vehicle, or any other "verified by
// admin" signal. iconOnly renders just the icon with a tooltip (compact,
// e.g. next to a name); otherwise the label renders inline (scannable in a
// list without needing to hover, e.g. trip result cards).
export default function VerifiedBadge({ icon: Icon = Shield, label, iconOnly = false, size = 13 }) {
    return (
        <span className="verified-badge" title={label}>
            <Icon size={size} />
            {!iconOnly && <span>{label}</span>}
        </span>
    );
}
