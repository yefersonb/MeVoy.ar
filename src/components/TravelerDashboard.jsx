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
    // scroll to hash target on mount
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
                    <TripSearch user={usuario} onBook={onReservar} />
                </div>
            </section>
        </div>
    );
}
