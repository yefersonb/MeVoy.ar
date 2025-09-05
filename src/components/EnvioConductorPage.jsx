// src/components/EnvioConductorPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import DetalleEnvioConductor from "./DetalleEnvioConductor";

// Unificar carga de Google Maps: buscar en todo el proyecto "useJsApiLoader(" o "LoadScript" y asegurar que usen las mismas opciones desde googleMapsConfig.js

export default function EnvioConductorPage() {
  const { envioId } = useParams();
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!envioId) return;

    const ref = doc(db, "envios", envioId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError("No se encontró el envío");
          setEnvio(null);
        } else {
          setEnvio({ id: snap.id, ...snap.data() });
          setError("");
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Error leyendo el envío");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [envioId]);

  if (!envioId) return <div>Falta parámetro <code>envioId</code>.</div>;
  if (loading) return <div>Cargando envío…</div>;
  if (error) return <div>{error}</div>;
  if (!envio) return null;

  return (
    <div>
      <DetalleEnvioConductor
        envio={envio}
        onAfterAccept={(data) => console.log("Preference creada:", data)}
      />
    </div>
  );
}
