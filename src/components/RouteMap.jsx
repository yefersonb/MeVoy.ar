import React, { useEffect, useRef, useState } from "react";
import { MapPin, AlertCircle } from "react-feather";

function RouteMap({ origen, destino }) {
  const mapRef = useRef(null);
  const [info, setInfo] = useState({ distancia: null, duracion: null, error: null, loading: true });

  const mapsAvailable = !!(window.google?.maps);

  useEffect(() => {
    if (!origen || !destino) {
      setInfo({ distancia: null, duracion: null, error: null, loading: false });
      return;
    }
    if (!mapsAvailable) {
      setInfo({ distancia: null, duracion: null, error: "maps_unavailable", loading: false });
      return;
    }

    setInfo({ distancia: null, duracion: null, error: null, loading: true });

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 7,
      center: { lat: -27.3671, lng: -55.8961 },
    });

    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#35669e", strokeWeight: 5 },
    });

    directionsService.route(
      {
        origin: origen,
        destination: destino,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          setInfo({ distancia: leg.distance.text, duracion: leg.duration.text, error: null, loading: false });
        } else {
          setInfo({ distancia: null, duracion: null, error: "route_failed", loading: false });
        }
      }
    );

    return () => { directionsRenderer.setMap(null); };
  }, [origen, destino, mapsAvailable]);

  if (!mapsAvailable || info.error === "maps_unavailable") {
    return (
      <div className="route-map-placeholder">
        <MapPin size={28} />
        <span>Mapa no disponible</span>
      </div>
    );
  }

  return (
    <div className="route-map-wrap">
      <div ref={mapRef} className="route-map-canvas" />
      {info.loading && (
        <div className="route-map-overlay">
          <MapPin size={24} />
          <span>Cargando mapa…</span>
        </div>
      )}
      {info.error === "route_failed" && (
        <div className="route-map-error">
          <AlertCircle size={16} />
          No se pudo trazar la ruta.
        </div>
      )}
      {info.distancia && info.duracion && (
        <div className="route-map-info">
          <span>{info.distancia}</span>
          <span className="route-map-info__sep">·</span>
          <span>{info.duracion} aprox.</span>
        </div>
      )}
    </div>
  );
}

export default RouteMap;