import { useEffect, useState } from "react";
import { X } from "react-feather";

export default function BottomSheet({ onClose, label = "Panel", children }) {
    const [visible, setVisible] = useState(false);

    // Defer visible by one frame so the CSS transition fires on mount
    useEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300); // let slide-down finish before unmounting
    };

    return (
        <>
            <div
                className={`ucs-backdrop${visible ? " ucs-backdrop--visible" : ""}`}
                onClick={handleClose}
            />
            <div
                className={`ucs-sheet${visible ? " ucs-sheet--visible" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={label}
            >
                <div className="ucs-handle" />
                <button className="ucs-close" onClick={handleClose} aria-label="Cerrar">
                    <X size={17} />
                </button>
                {children}
            </div>
        </>
    );
}
