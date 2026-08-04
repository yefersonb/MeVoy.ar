import { useState } from "react";
import { Check, X, MapPin, AlertCircle } from "react-feather";
import { abbreviateLocation } from "../utils/location";
import { useDrawer } from "../contexts/UserCardContext";

// Dev-only payment simulator. Mimics a MercadoPago checkout page.
// Opened via openDrawer() like any other sheet — calls onApprove/onReject, then closes itself.
export default function SimulatorCheckoutModal({ trip, reservation, onApprove, onReject }) {
    const [busy, setBusy]     = useState(false);
    const [result, setResult] = useState(null); // "approved" | "rejected"
    const { closeDrawer }     = useDrawer();

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
            closeDrawer();
        }, 1400);
    };

    const handleApprove = () => {
        if (busy || result) return;
        setBusy(true);
        finish(true);
    };

    const handleReject = () => {
        if (busy || result) return;
        setBusy(true);
        finish(false);
    };

    return (
        <div className="ucs-content sim-checkout">

            {/* Route */}
            <div className="trip-rating__route">
                <MapPin size={13} className="trip-rating__route-icon" />
                <span className="trip-rating__origin">{origin}</span>
                <span className="trip-rating__arrow">→</span>
                <span className="trip-rating__dest">{dest}</span>
            </div>

            {/* Amount */}
            <div className="ucs-section sim-checkout__amount">
                <span className="ucs-section__label">Total a pagar</span>
                <span className="sim-checkout__amount-value">${price}</span>
                <span className="sim-checkout__seats">
                    {seats} pasajero{seats !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Result feedback */}
            {result === "approved" && (
                <div className="sim-checkout__result sim-checkout__result--ok">
                    <Check size={18} />
                    <span>Pago aprobado</span>
                </div>
            )}

            {result === "rejected" && (
                <div className="sim-checkout__result sim-checkout__result--fail">
                    <X size={18} />
                    <span>Pago rechazado</span>
                </div>
            )}

            {/* Action buttons — hidden once a result is shown */}
            {!result && (
                <>
                    <div className="sim-checkout__actions">
                        <button
                            className="button"
                            style={{ background: "var(--color-success)" }}
                            onClick={handleApprove}
                            disabled={busy}
                        >
                            <Check size={15} /> Aprobar pago
                        </button>
                        <button
                            className="button"
                            style={{ background: "var(--color-danger)" }}
                            onClick={handleReject}
                            disabled={busy}
                        >
                            <X size={15} /> Rechazar pago
                        </button>
                    </div>

                    <p className="sim-checkout__disclaimer">
                        <AlertCircle size={11} />
                        Simulador de desarrollo · no se realizan cobros reales
                    </p>
                </>
            )}
        </div>
    );
}
