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

  if (cargando) return <div className="text-center py-6">Cargando perfil...</div>;

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
      <h2 className="text-3xl font-extrabold mb-6 text-center">🧳 Completá tu perfil de viajero</h2>

      {error && <div className="mb-4 text-red-600 text-center">{error}</div>}

      {!perfilCompleto && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-sm">
            Faltan datos para completar el perfil. Necesitás nombre, WhatsApp y dirección para poder reservar viajes. Completálos y guardá. 👇
          </p>
        </div>
      )}

      <label className="block mb-4">
        <span className="block font-semibold mb-1">Nombre completo</span>
        <input
          type="text"
          className="input mt-1 w-full rounded-md border px-3 py-2"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Juan Pérez"
        />
      </label>

      <label className="block mb-4">
        <span className="block font-semibold mb-1">WhatsApp</span>
        <input
          type="text"
          className="input mt-1 w-full rounded-md border px-3 py-2"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+54 9 3751 XXXX"
        />
      </label>

      <label className="block mb-6">
        <span className="block font-semibold mb-1">Dirección</span>
        <input
          type="text"
          className="input mt-1 w-full rounded-md border px-3 py-2"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Ciudad, barrio, etc."
        />
      </label>

      <div className="mb-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={perfilVisible}
            onChange={(e) => setPerfilVisible(e.target.checked)}
          />
          <span className="font-medium">Mostrar mi perfil al conductor</span>
        </label>
        {!perfilVisible && (
          <p className="text-yellow-600 text-sm mt-1">
            ⚠️ Si ocultás tu perfil, los conductores no podrán ver quién les reservó.
          </p>
        )}
      </div>

      <button
        onClick={handleGuardarPerfil}
        disabled={guardando}
        className="w-full py-3 font-bold rounded-xl shadow hover:scale-[1.01] transition disabled:opacity-50 bg-blue-600 text-white"
      >
        {guardando ? "Guardando..." : perfilCompleto ? "Guardar perfil" : "Faltan datos necesarios"}
      </button>

      {guardado && (
        <p className="mt-3 text-center text-green-600">
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
