import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";
import { CheckCircle, AlertCircle, Info, X } from "react-feather";

const ToastContext = createContext(null);

export function useToast() {
    return useContext(ToastContext);
}

const ICONS = {
    success: CheckCircle,
    error:   AlertCircle,
    info:    Info,
};

function ToastContainer({ toasts, onDismiss }) {
    if (!toasts.length) return null;
    return (
        <div className="toast-container" aria-live="polite" aria-atomic="false">
            {toasts.map(({ id, message, type }) => {
                const Icon = ICONS[type] || Info;
                return (
                    <div key={id} className={`toast toast--${type}`} role="alert">
                        <Icon size={16} className="toast__icon" />
                        <span className="toast__message">{message}</span>
                        <button
                            className="toast__close"
                            onClick={() => onDismiss(id)}
                            aria-label="Cerrar notificación"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const show = useCallback((message, type = "info", duration = 4500) => {
        const id = ++counter.current;
        setToasts(prev => [...prev, { id, message, type }]);
        if (duration > 0) setTimeout(() => dismiss(id), duration);
        return id;
    }, [dismiss]);

    const api = useMemo(() => ({
        show,
        success: (msg, dur) => show(msg, "success", dur),
        error:   (msg, dur) => show(msg, "error",   dur),
        info:    (msg, dur) => show(msg, "info",    dur),
    }), [show]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}
