// src/components/PerfilConductorV2.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import VehiculosConductor from "./VehiculosConductor";
import NuevoViaje from "./NuevoViaje";

export default function PerfilConductorV2() {
  const { usuario } = useUser();
  const [perfil, setPerfil] = useState({
    whatsapp: "", fechaNacimiento: "", modeloVehiculo: "", descripcion: "", nivelExperiencia: "Novato",
    preferencias: {}, verificaciones: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showVehiculos, setShowVehiculos] = useState(false);
  const [showNuevoViaje, setShowNuevoViaje] = useState(false);

  // Fetch profile data
  const fetchPerfil = useCallback(async () => {
    if (!usuario) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "usuarios", usuario.uid));
      if (snap.exists()) {
        const data = snap.data();
        setPerfil({
          whatsapp: data.whatsapp || "",
          fechaNacimiento: data.fechaNacimiento || "",
          modeloVehiculo: data.modeloVehiculo || "",
          descripcion: data.descripcion || "",
          nivelExperiencia: data.nivelExperiencia || "Novato",
          preferencias: data.preferencias || {},
          verificaciones: data.verificaciones || {}
        });
      }
    } catch (e) {
      console.error(e);
      setError("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => { fetchPerfil(); }, [fetchPerfil]);

  const edad = useMemo(() => {
    if (!perfil.fechaNacimiento) return null;
    const hoy = new Date(), nacimiento = new Date(perfil.fechaNacimiento);
    let a = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) a--;
    return a;
  }, [perfil.fechaNacimiento]);

  if (loading) return <p>Cargando perfil…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Sticky Nav: solo Perfil Conductor */}
      <nav className="sticky top-0 bg-gray-200 p-4 z-20">
        <div className="container mx-auto flex justify-center">
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Perfil Conductor
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-4">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <img src={usuario.photoURL} alt="Perfil" className="w-24 h-24 rounded-full" />
              <div>
                <h2 className="text-2xl font-bold">{usuario.displayName}</h2>
                {edad != null && <p>{edad} años</p>}
              </div>
            </div>
            <button
              onClick={() => setIsEditing(x => !x)}
              className="px-3 py-1 bg-green-500 text-white rounded"
            >
              {isEditing ? '✖️ Cancelar' : '✏️ Editar'}
            </button>
          </div>
          {isEditing ? (
            <div>{/* Edit form content */}</div>
          ) : (
            <div>{/* Profile details content */}</div>
          )}
        </div>

        {/* Botones de acciones aparte */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowVehiculos(v => !v)}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            {showVehiculos ? 'Ocultar mis vehículos' : '🚗 Mis Vehículos'}
          </button>
          <button
            onClick={() => setShowNuevoViaje(true)}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            🚣️ Agregar Viaje
          </button>
        </div>

        {/* Sección Mis Vehículos */}
        {showVehiculos && <VehiculosConductor onVerify={() => {}} />}

        {/* Modal Nuevo Viaje */}
        {showNuevoViaje && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-30">
            <div className="bg-white p-6 rounded-2xl shadow-lg max-w-2xl w-full overflow-auto max-h-[90vh]">
              <NuevoViaje />
              <div className="mt-4 text-right">
                <button
                  onClick={() => setShowNuevoViaje(false)}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
