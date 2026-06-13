import { useState } from "react";
import { CreditCard, Check, X, MapPin, AlertCircle } from "react-feather";
import { abbreviateLocation } from "../utils/location";
import "../styles/simulator.css";

// Dev-only payment simulator. Mimics a MercadoPago checkout page.
// Renders over the app as an overlay; calls onApprove or onReject and then onClose.
export default function SimulatorCheckoutModal({
    trip,
    reservation,
    onApprove,
    onReject,
    onClose,
}) {
    const [busy, setBusy]   = useState(false);
    const [result, setResult] = useState(null); // "approved" | "rejected"

    const seats  = reservation?.cantidadPasajeros || 1;
    const price  = trip?.precio ? (trip.precio * seats).toLocaleString("es-AR") : "—";
    const origin = abbreviateLocation(trip?.origen  ?? "Origen");
    const dest   = abbreviateLocation(trip?.destino ?? "Destino");

    const finish = (approved) => {
        const simulatedId = approved ? `SIM-${Date.now()}` : null;
        setResult(approved ? "approved" : "rejected");
        setTimeout(() => {
            if (approved) onApprove?.(simulatedId);
            else          onReject?.();
            onClose?.();
        }, 1400);
    };

    const handleApprove = async () => {
        if (busy || result) return;
        setBusy(true);
        finish(true);
    };

    const handleReject = async () => {
        if (busy || result) return;
        setBusy(true);
        finish(false);
    };

    return (
        <div
            className="sim-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget && !busy && !result) onClose?.();
            }}
        >
            <div className="sim-modal">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="sim-modal__header">
                    <CreditCard size={16} className="sim-modal__header-icon" />
                    <span className="sim-modal__header-title">Checkout · MeVoy</span>
                    <button
                        className="sim-modal__close"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className="sim-modal__body">

                    {/* Route */}
                    <div className="sim-modal__route">
                        <MapPin size={13} />
                        <span>{origin}</span>
                        <span className="sim-modal__route-arrow">→</span>
                        <span>{dest}</span>
                    </div>

                    {/* Amount */}
                    <div className="sim-modal__amount-block">
                        <span className="sim-modal__amount-label">Total a pagar</span>
                        <span className="sim-modal__amount-value">${price}</span>
                        <span className="sim-modal__seats">
                            {seats} pasajero{seats !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Result feedback */}
                    {result === "approved" && (
                        <div className="sim-modal__result sim-modal__result--ok">
                            <Check size={20} />
                            <span>Pago aprobado</span>
                        </div>
                    )}

                    {result === "rejected" && (
                        <div className="sim-modal__result sim-modal__result--fail">
                            <X size={20} />
                            <span>Pago rechazado</span>
                        </div>
                    )}

                    {/* Action buttons — hidden once a result is shown */}
                    {!result && (
                        <>
                            <div className="sim-modal__actions">
                                <button
                                    className="sim-modal__btn sim-modal__btn--approve"
                                    onClick={handleApprove}
                                    disabled={busy}
                                >
                                    <Check size={15} /> Aprobar pago
                                </button>
                                <button
                                    className="sim-modal__btn sim-modal__btn--reject"
                                    onClick={handleReject}
                                    disabled={busy}
                                >
                                    <X size={15} /> Rechazar pago
                                </button>
                            </div>

                            <div className="sim-modal__disclaimer">
                                <AlertCircle size={11} />
                                Simulador de desarrollo · no se realizan cobros reales
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
