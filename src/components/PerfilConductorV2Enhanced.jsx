/* ToDo: Renombrar este archivo PRONTO — Eso incluye reparar todas las referencias que dependan de éste */

// src/components/PerfilConductorV2Enhanced.jsx
import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { usePerfilData } from "../hooks/usePerfilData";
import { useViajesData } from "../hooks/useViajesData";
import { useResponsive } from "../hooks/useResponsive";
import usePhotoUpload from "../hooks/usePhotoUpload";
//import TabNavigation from "./TabNavigation";
import TabNavigation from "./TabNavigation"; // removido: barra horizontal
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
import IDCard from "./idcard/IDCard";

// 👇 NUEVO: agregamos "Envíos"
//const menuItems = ["Perfil", "Verificación", "Vehículos", "Reservas", "Envíos", "Nuevo Viaje"];
const DEFAULT_TAB = "Perfil"; // fallback estable sin depender de menuItems
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
    }[h] || DEFAULT_TAB);

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

      /* Todo: Mover esto a una página componente */
      case "Verificación":
        return (
          <div>
            <VerificacionConductorWizard onExit={() => handleTabChange("Perfil")} />
          </div>
        );


 
     case "Vehículos":
        return (
          <section >
            <div >
              <h1 >
                <span >
                  🚗
                </span>
                Mis Vehículos
              </h1>
              <p >Gestiona tus vehículos registrados</p>
            </div>
            <div >
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
          <section >
            <div >
              <h1 >
                <span >
                  📦
                </span>
                Envíos de Paquetes
              </h1>
              <p >
                Aceptá solicitudes, iniciá retiros y confirmá entregas con PIN.
              </p>
            </div>

            <div >
              {/* Bloque 1: Envíos disponibles para aceptar */}
              <div >
                <div >
                  <h3 >Envíos disponibles</h3>
                  <span >Conductor</span>
                </div>
                <p >
                  Mirá los envíos públicos y aceptá los que te sirvan.
                </p>
                <div >
                  <EnviosDisponibles />
                </div>
              </div>

              {/* Bloque 2: Envíos vinculados a tus viajes */}
              <div >
                <div >
                  <h3 >Vinculados a tus viajes</h3>
                  <button
                    type="button"
                    onClick={loadViajesYReservas}
                    
                  >
                    Refrescar
                  </button>
                </div>

                <div >
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
          <section >
            <div >
              <p >
                <strong>Publica tu próximo viaje y encuentra pasajeros</strong>
              </p>
            </div>
            <div >
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
      {/* Barra horizontal removida: navegación queda por hash via Header */}
      {renderTabContent()}
    </div>
  );
}
