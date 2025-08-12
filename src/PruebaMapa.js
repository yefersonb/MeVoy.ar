import React, { useEffect, useRef } from "react";

export default function PruebaMapa() {
  const mapRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      new window.google.maps.Map(mapRef.current, {
        center: { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
        zoom: 10,
      });
    }
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "2rem auto" }}>
      <h2>Prueba de Google Maps</h2>
      <div
        ref={mapRef}
        style={{ width: "100%", height: "400px", border: "1px solid #ccc" }}
      />
    </div>
  );
}