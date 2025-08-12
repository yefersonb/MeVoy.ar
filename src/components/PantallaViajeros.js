// src/components/PerfilViajero.js
import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function PerfilViajero() {
  const { usuario } = useUser();
  const [whatsapp, setWhatsapp] = useState("");
  const [hasWhats, setHasWhats] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [reputacion, setReputacion] = useState("");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    const cargarPerfil = async () => {
      try {
        const ref = doc(db, "usuarios", usuario.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.whatsapp) {
            setWhatsapp(data.whatsapp);
            setHasWhats(true);
          }
          if (data.direccion) setDireccion(data.direccion);
          if (data.reputacion) setReputacion(data.reputacion);
        }
      } catch (error) {
        console.error("Error cargando perfil de viajero:", error);
      }
    };
    cargarPerfil();
  }, [usuario]);

  const guardarPerfil = async () => {
    if (!hasWhats && !whatsapp) {
      alert("Por favor, ingresá tu número de WhatsApp");
      return;
    }

    const perfil = {
      nombre: usuario.displayName,
      fotoPerfil: usuario.photoURL,
      rol: "viajero",
      whatsapp,
      direccion,
      reputacion,
      fechaRegistro: new Date(),
    };

    try {
      await setDoc(doc(db, "usuarios", usuario.uid), perfil, { merge: true });
      setHasWhats(true);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
      console.log("Perfil viajero guardado:", perfil);
    } catch (error) {
      console.error("Error guardando perfil de viajero:", error);
      alert("Hubo un error al guardar tu perfil. Intentá nuevamente.");
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-center">📋 Tu perfil como viajero</h2>

      <label className="block mt-4">
        WhatsApp:
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ej: 3751556677"
          className="input mt-1"
        />
      </label>

      <label className="block mt-4">
        Dirección:
        <input
          type="text"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Ej: Montecarlo, Misiones"
          className="input mt-1"
        />
      </label>

      <label className="block mt-4">
        Reputación:
        <input
          type="text"
          value={reputacion}
          onChange={(e) => setReputacion(e.target.value)}
          placeholder="Ej: ⭐️⭐️⭐️⭐️"
          className="input mt-1"
        />
      </label>

      <div className="flex gap-2 mt-4">
        <button className="btn btn-primary flex-1" onClick={guardarPerfil}>
          Guardar perfil viajero
        </button>
      </div>

      {guardado && (
        <p className="mt-2 text-center text-green-600">
          ✅ Perfil guardado con éxito
        </p>
      )}
    </div>
  );
}
