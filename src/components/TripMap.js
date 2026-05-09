import React, { useEffect, useRef, useState } from "react";

const ViajeMapa = ({ origen, destino }) => {
  const mapRef = useRef(null);
  const [infoViaje, setInfoViaje] = useState(null);

  useEffect(() => {
    if (!window.google) return;

    // Crear mapa
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 7,
      center: { lat: -27.3671, lng: -55.8961 }, // Centro aproximado en Misiones
    });

    // Crear el servicio y el renderer
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Solicitar la ruta
    directionsService.route(
      {
        origin: origen,
        destination: destino,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
          // Extraer distancia y duración
          const leg = result.routes[0].legs[0];
          setInfoViaje({
            distancia: leg.distance.text,
            duracion: leg.duration.text,
          });
        } else {
          setInfoViaje(null);
        }
      }
    );
  }, [origen, destino]);

  return (
    <div>
      <div
        ref={mapRef}
        style={{ width: "100%", height: "350px", marginBottom: "1rem" }}
      />
      {infoViaje ? (
        <div>
          <strong>Distancia:</strong> {infoViaje.distancia} <br />
          <strong>Duración estimada:</strong> {infoViaje.duracion}
        </div>
      ) : (
        <div>No se pudo calcular la ruta.</div>
      )}
    </div>
  );
};

export default ViajeMapa;