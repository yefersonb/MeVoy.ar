import React, { useEffect } from "react";
import TravelerProfilePage from "./TravelerProfilePage";
import TripSearch from "./TripSearch";

export default function TravelerDashboard({
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
            <TravelerProfilePage perfilCompleto={perfilCompleto} />

            <section id="mis-viajes" style={{ scrollMarginTop: 80 }}>
                <div className="panel">
                    <TripSearch usuario={usuario} onReservar={onReservar} />
                </div>
            </section>
        </div>
    );
}
