// src/components/PerfilViajero.js — Formulario de perfil para viajeros
import React, { useState, useEffect, useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function PerfilViajero({ onPerfilCompletoChange }) {
  const { usuario } = useUser();

  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [perfilVisible, setPerfilVisible] = useState(true);
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Chequeo de completitud
  const perfilCompleto = useMemo(() => {
    return (
      nombre.trim().length > 0 &&
      whatsapp.trim().length > 0 &&
      direccion.trim().length > 0
    );
  }, [nombre, whatsapp, direccion]);

  useEffect(() => {
    if (typeof onPerfilCompletoChange === "function") {
      onPerfilCompletoChange(perfilCompleto);
    }
  }, [perfilCompleto, onPerfilCompletoChange]);

  // Cargar perfil si existe
  useEffect(() => {
    if (!usuario?.uid) return;
    (async () => {
      try {
        const ref = doc(db, "usuarios", usuario.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setNombre(data.nombre || "");
          setWhatsapp(data.whatsapp || "");
          setDireccion(data.direccion || "");
          setPerfilVisible(data.perfilVisible ?? true);
        }
      } catch (e) {
        console.error("Error cargando perfil viajero:", e);
        setError("No se pudo cargar el perfil.");
      } finally {
        setCargando(false);
      }
    })();
  }, [usuario]);

  const handleGuardarPerfil = async () => {
    if (!perfilCompleto) {
      alert("Completa nombre, WhatsApp y dirección antes de continuar.");
      return;
    }
    if (!usuario?.uid) return;
    setGuardando(true);
    setError(null);
    try {
      await setDoc(
        doc(db, "usuarios", usuario.uid),
        {
          rol: "viajero",
          nombre: nombre.trim(),
          whatsapp: whatsapp.trim(),
          direccion: direccion.trim(),
          perfilVisible,
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );
      setGuardado(true);
      setTimeout(() => {
        window.location.href = "/"; // o reemplazar por navegación programática
      }, 1000);
    } catch (e) {
      console.error("Error guardando perfil:", e);
      setError("Hubo un error al guardar tu perfil. Intentá nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div >Cargando perfil...</div>;

  return (
    <div>
      <h2>🧳 Completá tu perfil de viajero</h2>

      {error && <div>{error}</div>}

      {!perfilCompleto && (
        <div>
          <p>
            Faltan datos para completar el perfil. Necesitás nombre, WhatsApp y dirección para poder reservar viajes. Completálos y guardá. 👇
          </p>
        </div>
      )}

      <label>
        <span>Nombre completo</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Juan Pérez"
        />
      </label>

      <label>
        <span>WhatsApp</span>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+54 9 3751 XXXX"
        />
      </label>

      <label>
        <span>Dirección</span>
        <input
          type="text"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Ciudad, barrio, etc."
        />
      </label>

      <div >
        <label>
          <input
            type="checkbox"
            checked={perfilVisible}
            onChange={(e) => setPerfilVisible(e.target.checked)}
          />
          <span >Mostrar mi perfil al conductor</span>
        </label>
        {!perfilVisible && (
          <p>
            ⚠️ Si ocultás tu perfil, los conductores no podrán ver quién les reservó.
          </p>
        )}
      </div>

      <button
        onClick={handleGuardarPerfil}
        disabled={guardando}
      >
        {guardando ? "Guardando..." : perfilCompleto ? "Guardar perfil" : "Faltan datos necesarios"}
      </button>

      {guardado && (
        <p>
          ✅ Perfil guardado con éxito. Redirigiendo...
        </p>
      )}
    </div>
  );
}

// Ejemplo de guard / chequeo antes de reservar (puede ser hook separado):
export function usePuedeReservar(perfil) {
  // perfil debería tener nombre, whatsapp, direccion y perfilVisible si corresponde
  return (
    perfil?.nombre?.trim()?.length > 0 &&
    perfil?.whatsapp?.trim()?.length > 0 &&
    perfil?.direccion?.trim()?.length > 0
  );
}
