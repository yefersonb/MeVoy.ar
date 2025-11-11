import React, { useEffect } from "react";
import PerfilViajeroPage from "./PerfilViajeroPage";
import BuscadorViajes from "./BuscadorViajes";

export default function ViajeroDashboard({
    usuario,
    viajes,
    perfilCompleto,
    viajeReservado,
    onReservar,
}) {
    // si hay hash (#mis-viajes / #perfil), hace scroll al cargar
    useEffect(() => {
        const id = (window.location.hash || "").replace("#", "");
        if (!id) return;
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    return (
        <div style={{margin: 8}}>
            <PerfilViajeroPage perfilCompleto={perfilCompleto} />

            <section id="mis-viajes" style={{ scrollMarginTop: 80 }}>
                <div className="panel">
                    {/* Usá los props que ya tenías en tu buscador, esto es seguro */}
                    <BuscadorViajes usuario={usuario} onReservar={onReservar} />
                </div>
            </section>
        </div>
    );
}
