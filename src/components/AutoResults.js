import React, { useState } from "react";

export default function AutoResults({ viajes = [], onReservar }) {
  console.log("âš¡ï¸ AutoResults cargado. viajes:", viajes);

  const [openId, setOpenId] = useState(null);
  const [routeInfo, setRouteInfo] = useState({});
  const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const toggleDetails = (v) => {
    if (openId === v.id) {
      setOpenId(null);
      return;
    }
    setOpenId(v.id);
    if (routeInfo[v.id]) return;

    if (!window.google?.maps) {
      console.error("Google Maps JS API no cargada");
      return;
    }
    new window.google.maps.DirectionsService().route(
      {
        origin: v.origen,
        destination: v.destino,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          const leg = result.routes[0].legs[0];
          setRouteInfo((ri) => ({
            ...ri,
            [v.id]: {
              distancia: leg.distance.text,
              duracion: leg.duration.text,
              center: {
                lat: leg.end_location.lat(),
                lng: leg.end_location.lng(),
              },
            },
          }));
        } else {
          console.error("Error calculando ruta:", status);
        }
      }
    );
  };

  if (!viajes.length) return <p>No se encontraron viajes.</p>;

  return (
    <div>
      {viajes.map((v) => {
        const info = routeInfo[v.id];
        const price = v.valor ?? v.precio ?? "N/D";
        const mapUrl =
          info &&
          `https://maps.googleapis.com/maps/api/staticmap?center=${info.center.lat},${info.center.lng}` +
            `&zoom=8&size=200x100&markers=color:red%7C${info.center.lat},${info.center.lng}` +
            `&key=${API_KEY}`;

        return (
          <div
            key={v.id}
            style={{
              background: "#eef2f7",
              padding: "1rem",
              margin: "1rem 0",
              borderRadius: 8,
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <div>
                <strong>
                  {v.origen} â†’ {v.destino}
                </strong>
                <br />
                <small>
                  Fecha: {new Date(v.fecha).toLocaleString()}
                  <br />
                  Asientos: {v.asientosDisponibles}
                  <br />
                  Contacto:{" "}
                  {typeof v.conductor === "object"
                    ? v.conductor.nombre
                    : v.conductor}
                </small>
              </div>
              {/* El botón que despliega detalles/mapa */}
              <button
                onClick={() => toggleDetails(v)}
                style={{
                  background: "#007bff",
                  color: "var(--color-surface)",
                  border: "none",
                  padding: "0.5rem",
                  borderRadius: 4,
                  cursor: "pointer",
                  height: "fit-content",
                }}
              >
                {openId === v.id ? "Ocultar detalles" : "Ver detalles"}
              </button>
            </div>

            {openId === v.id && (
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  background: "var(--color-surface)",
                  borderRadius: 6,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}
              >
                {!info ? (
                  <p>Cargando detallesâ€¦</p>
                ) : (
                  <>
                    <p>
                      ðŸš— Distancia: {info.distancia} Â· â± Duración:{" "}
                      {info.duracion}
                    </p>
                    <p>ðŸ’° Precio: ${price}</p>
                    <img
                      src={mapUrl}
                      alt="Mini mapa"
                      style={{ borderRadius: 4, marginBottom: 8 }}
                      onError={(e) =>
                        (e.currentTarget.style.display = "none")
                      }
                    />
                    <button
                      onClick={() => onReservar(v.id)}
                      style={{
                        background: "#28a745",
                        color: "var(--color-surface)",
                        border: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Confirmar reserva
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

