/* ToDo: Renombrar este archivo PRONTO */

// src/components/PerfilConductorV2Enhanced.jsx
import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { usePerfilData } from "../hooks/usePerfilData";
import { useViajesData } from "../hooks/useViajesData";
import { useResponsive } from "../hooks/useResponsive";
import usePhotoUpload from "../hooks/usePhotoUpload";
import TabNavigation from "./TabNavigation";
import PerfilSection from "./PerfilSection";
import ViajesSection from "./ViajesSection";
import VehiculosConductor from "./VehiculosConductor";
import NuevoViaje from "./NuevoViaje";
import VerificacionConductorWizard from "./VerificacionConductorWizard";


// hash routing suave
import useHashSection from "../hooks/useHashSection";

// 👇 NUEVO
import EnviosDelViaje from "./EnviosDelViaje";
import EnviosDisponibles from "./EnviosDisponibles";

// 👇 NUEVO: agregamos "Envíos"
const menuItems = ["Perfil", "Verificación", "Vehículos", "Reservas", "Envíos", "Nuevo Viaje"];

export default function PerfilConductorV2Enhanced({
  viajes: viajesProp,
  reservas: reservasProp,
}) {
  // ===== HOOKS Y ESTADO =====
  const { usuario } = useUser();
  const { isMobile } = useResponsive();

  // Hash ↔ pestaña (mapea links del Header)
  const section = useHashSection();
  const tabFromHash = (h) =>
    ({
      "mis-vehiculos": "Vehículos",
      reservas: "Reservas",
      envios: "Envíos",
      verificacion: "Verificación",
      "nuevo-viaje": "Nuevo Viaje",
      perfil: "Perfil",
    }[h] || menuItems[0]);

  const hashFromTab = (t) =>
    ({
      Vehículos: "mis-vehiculos",
      Reservas: "reservas",
      Envíos: "envios",
      Verificación: "verificacion",
      "Nuevo Viaje": "nuevo-viaje",
      Perfil: "perfil",
    }[t] || "perfil");

  const [activeTab, setActiveTab] = useState(tabFromHash(section));
  const [editMode, setEditMode] = useState(false);

  // Hook para datos del perfil
  const {
    perfil,
    loading: loadingPerfil,
    error: errorPerfil,
    guardado,
    updatePerfil,
    savePerfil,
    cancelEdit,
  } = usePerfilData(usuario);

  // Hook para datos de viajes
  const {
    viajesPublicados,
    reservasRecibidas,
    loading: loadingViajes,
    error: errorViajes,
    loadViajesYReservas,
    eliminarViaje,
  } = useViajesData(usuario);

  // Sincroniza cuando cambia el hash (click en menú)
  useEffect(() => {
    const next = tabFromHash(section);
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line
  }, [section]);

  // Carga inicial de viajes y reservas
  useEffect(() => {
    if (usuario) {
      loadViajesYReservas();
    }
    // eslint-disable-next-line
  }, [usuario]);

  // Hook para subida de fotos
  const { preview, uploading, handlePhotoSelected } = usePhotoUpload(
    usuario?.uid || ""
  );

  // ===== HANDLERS =====
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.location.hash = hashFromTab(tab); // ← actualiza hash
    setEditMode(false);
  };

  const handleCreateTrip = () => {
    setActiveTab("Nuevo Viaje");
    window.location.hash = "nuevo-viaje";
  };

  const handleSave = async () => {
    try {
      await savePerfil();
      setEditMode(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = () => {
    cancelEdit();
    setEditMode(false);
  };

  const onPhotoSelected = async (e) => {
    const url = await handlePhotoSelected(e);
    if (url) {
      updatePerfil("fotoURL", url);
      if (usuario) {
        await savePerfil();
      }
    }
  };

  // ===== RENDER CONDICIONAL DE CONTENIDO =====
  const renderTabContent = () => {
    switch (activeTab)
    {
      case "Perfil":
        return (
          <PerfilSection
            perfil={perfil}
            loading={loadingPerfil}
            error={errorPerfil}
            editMode={editMode}
            guardado={guardado}
            onEdit={() => setEditMode(true)}
            onSave={handleSave}
            onCancel={handleCancel}
            onPerfilChange={updatePerfil}
            onPhotoSelected={onPhotoSelected}
            preview={preview}
            uploading={uploading}
          />
        );

      case "Verificación":
        return (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden section-card">
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">🪪</span>
                Verificación de identidad
              </h1>
              <p className="text-violet-100 mt-1">Cargá tu DNI y licencia paso a paso.</p>
            </div>
            <div className="p-6">
              <VerificacionConductorWizard onExit={() => handleTabChange("Perfil")} />
            </div>
          </section>
        );


 
     case "Vehículos":
        return (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden section-card">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">
                  🚗
                </span>
                Mis Vehículos
              </h1>
              <p className="text-blue-100 mt-1">Gestiona tus vehículos registrados</p>
            </div>
            <div className="p-6">
              <VehiculosConductor viajes={viajesProp} reservas={reservasProp} />
            </div>
          </section>
        );

      case "Reservas":
        return (
          <ViajesSection
            viajesPublicados={viajesPublicados}
            reservasRecibidas={reservasRecibidas}
            loading={loadingViajes}
            error={errorViajes}
            onLoadData={loadViajesYReservas}
            onEliminarViaje={eliminarViaje}
          />
        );

      // 👇 Envíos para el CONDUCTOR
      case "Envíos":
        return (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden section-card">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">
                  📦
                </span>
                Envíos de Paquetes
              </h1>
              <p className="text-indigo-100 mt-1">
                Aceptá solicitudes, iniciá retiros y confirmá entregas con PIN.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Bloque 1: Envíos disponibles para aceptar */}
              <div className="p-4 rounded border bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Envíos disponibles</h3>
                  <span className="text-xs text-gray-500">Conductor</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Mirá los envíos públicos y aceptá los que te sirvan.
                </p>
                <div className="mt-3">
                  <EnviosDisponibles />
                </div>
              </div>

              {/* Bloque 2: Envíos vinculados a tus viajes */}
              <div className="p-4 rounded border bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Vinculados a tus viajes</h3>
                  <button
                    type="button"
                    onClick={loadViajesYReservas}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Refrescar
                  </button>
                </div>

                <div className="mt-3">
                  <EnviosDelViaje
                    conductorId={usuario?.uid}
                    viajesPublicados={viajesPublicados}
                    onRefrescar={loadViajesYReservas}
                  />
                </div>
              </div>
            </div>
          </section>
        );

      case "Nuevo Viaje":
        return (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden section-card">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <p className="text-green-100 mt-1 font-bold">
                <strong>Publica tu próximo viaje y encuentra pasajeros</strong>
              </p>
            </div>
            <div className="p-6">
              <NuevoViaje />
            </div>
          </section>
        );

      default:
        return null;
    } // FIN SWITCH
  };

  // ===== RENDER PRINCIPAL =====
  return (
    <div>
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        menuItems={menuItems}
        onCreateTrip={handleCreateTrip}
        userRole={usuario?.rol}
      />
      {renderTabContent()}
    </div>
  );
}
