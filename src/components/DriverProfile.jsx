// src/components/DriverProfile.jsx
import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { useToast } from "../contexts/ToastContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { usePerfilData } from "../hooks/usePerfilData";
import { useTripsData } from "../hooks/useTripsData";
import { useResponsive } from "../hooks/useResponsive";
import usePhotoUpload from "../hooks/usePhotoUpload";
import ProfileSection from "./ProfileSection";
import TripsSection from "./TripsSection";
import VehiculosConductor from "./VehiculosConductor";
import NewTrip from "./NewTrip";
import DriverVerificationWizard from "./DriverVerificationWizard";
import useHashSection from "../hooks/useHashSection";
import TripShipments from "./TripShipments";
import AvailableShipments from "./AvailableShipments";
import IDCard from "./idcard/IDCard";

// Added "Envíos" tab
//const menuItems = ["Perfil", "Verificación", "Vehículos", "Reservas", "Envíos", "Nuevo Viaje"];
const DEFAULT_TAB = "Perfil"; // fallback estable sin depender de menuItems
export default function DriverProfile({
  viajes: viajesProp,
  reservas: reservasProp,
  onGoToVehicles,
}) {
  // ===== HOOKS Y ESTADO =====
  const { usuario, setPreview } = useUser();
  const toast = useToast();
  const { isMobile } = useResponsive();

  // Hash ↔ tab mapping (mirrors Header links)
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
    publishedTrips,
    incomingReservations,
    loading: loadingTrips,
    error: errorTrips,
    loadTripsAndReservations,
    deleteTrip,
  } = useTripsData(usuario);

  // Sync when hash changes (menu click)
  useEffect(() => {
    const next = tabFromHash(section);
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line
  }, [section]);

  // Initial load of trips and reservations
  useEffect(() => {
    if (usuario) {
      loadTripsAndReservations();
    }
    // eslint-disable-next-line
  }, [usuario]);

  // Hook para subida de fotos
  const { uploading, uploadCroppedFile } = usePhotoUpload(
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

  const onCroppedFile = async (file) => {
    const url = await uploadCroppedFile(file);
    if (url && usuario) {
      setPreview(url); // swap blob preview for the permanent Firebase URL
      await setDoc(doc(db, "usuarios", usuario.uid), { fotoURL: url }, { merge: true });
    } else {
      setPreview(null);
      toast.error("No se pudo subir la foto. Intentá de nuevo.");
    }
  };

  // ===== RENDER CONDICIONAL DE CONTENIDO =====
  const renderTabContent = () => {
    switch (activeTab)
    {
      case "Perfil":
        return (
          <ProfileSection
            perfil={perfil}
            loading={loadingPerfil}
            error={errorPerfil}
            editMode={editMode}
            guardado={guardado}
            onEdit={() => setEditMode(true)}
            onSave={handleSave}
            onCancel={handleCancel}
            onPerfilChange={updatePerfil}
            onCroppedFile={onCroppedFile}
            uploading={uploading}
          />
        );

      /* TODO: Move this to a page component */
      case "Verificación":
        return (
          <div>
            <DriverVerificationWizard onExit={() => handleTabChange("Perfil")} />
          </div>
        );


 
     case "Vehículos":
        return (
          <VehiculosConductor viajes={viajesProp} reservas={reservasProp} />
        );

      case "Reservas":
        return (
          <TripsSection
            viajesPublicados={publishedTrips}
            reservasRecibidas={incomingReservations}
            loading={loadingTrips}
            error={errorTrips}
            onLoadData={loadTripsAndReservations}
            onEliminarViaje={deleteTrip}
          />
        );

      // Shipments tab for the driver
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
              {/* Block 1: Available shipments to accept */}
              <div >
                <div >
                  <h3 >Envíos disponibles</h3>
                  <span >Conductor</span>
                </div>
                <p >
                  Mirá los envíos públicos y aceptá los que te sirvan.
                </p>
                <div >
                  <AvailableShipments />
                </div>
              </div>

              {/* Block 2: Shipments linked to your trips */}
              <div >
                <div >
                  <h3 >Vinculados a tus viajes</h3>
                  <button
                    type="button"
                    onClick={loadTripsAndReservations}

                  >
                    Refrescar
                  </button>
                </div>

                <div >
                  <TripShipments
                    conductorId={usuario?.uid}
                    viajesPublicados={publishedTrips}
                    onRefrescar={loadTripsAndReservations}
                  />
                </div>
              </div>
            </div>
          </section>
        );

      case "Nuevo Viaje":
        return <NewTrip onGoToVehicles={onGoToVehicles} />;

      default:
        return null;
    } // FIN SWITCH
  };

  // ===== RENDER PRINCIPAL =====
  return (
    <div>
      {/* Horizontal bar removed: navigation handled by hash via Header */}
      {renderTabContent()}
    </div>
  );
}
