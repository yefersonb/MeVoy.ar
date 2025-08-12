import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function ViajesDisponibles() {
  const [viajes, setViajes] = useState([]);

  useEffect(() => {
    const fetchViajes = async () => {
      const querySnapshot = await getDocs(collection(db, "viajes"));
      const data = [];
      querySnapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setViajes(data);
    };

    fetchViajes();
  }, []);

  return (
    <div>
      <h2>Viajes Disponibles</h2>
      {viajes.length === 0 && <p>No hay viajes publicados.</p>}
      {viajes.map((viaje) => (
        <div key={viaje.id} style={{border: "1px solid #ccc", margin: "10px", padding: "10px"}}>
          <p><b>Origen:</b> {viaje.origen}</p>
          <p><b>Destino:</b> {viaje.destino}</p>
          <p><b>Fecha:</b> {viaje.fecha}</p>
          <p><b>Asientos disponibles:</b> {viaje.asientos}</p>
          <p><b>Conductor:</b> {viaje.conductor.nombre}</p>
          <a 
            href={`https://wa.me/54${viaje.conductor.whatsapp}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{color: "green", fontWeight: "bold"}}
          >
            Contactar por WhatsApp
          </a>
        </div>
      ))}
    </div>
  );
}
