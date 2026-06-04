import { useEffect, useState } from "react";
import { X } from "react-feather";

// depth 0 = top sheet (fully visible, backdrop active)
// depth 1+ = sheet below — scaled back, dimmed, non-interactive
export default function BottomSheet({ onClose, label = "Panel", depth = 0, children }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    const isTop    = depth === 0;
    const sheetCls = [
        "ucs-sheet",
        visible && (isTop ? "ucs-sheet--visible" : "ucs-sheet--pushed"),
    ].filter(Boolean).join(" ");

    return (
        <>
            {/* Only the top sheet gets a visible, clickable backdrop */}
            <div
                className={`ucs-backdrop${isTop && visible ? " ucs-backdrop--visible" : ""}`}
                onClick={isTop ? handleClose : undefined}
                style={!isTop ? { pointerEvents: "none" } : undefined}
            />

            <div
                className={sheetCls}
                style={!isTop ? { pointerEvents: "none" } : undefined}
                role="dialog"
                aria-modal="true"
                aria-label={label}
            >
                <div className="ucs-handle" />
                {isTop && (
                    <button className="ucs-close" onClick={handleClose} aria-label="Cerrar">
                        <X size={17} />
                    </button>
                )}
                {children}
            </div>
        </>
    );
}
