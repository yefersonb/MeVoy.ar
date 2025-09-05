import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import VehiculosConductor from "./VehiculosConductor";
import ReservasRecibidas from "./ReservasRecibidas";
import InputField from "./ui/InputField";
import Badge from "./Badge";
import RatingRow from "./RatingRow";
import ActionBar from "./ActionBar";
import { usePhotoUpload } from "../hooks/usePhotoUpload";

// Tab horizontal con hover y subrayado animado
const TabButton = ({ active, children, onClick }) => (
  <span
    onClick={onClick}
    style={{
      cursor: "pointer",
      color: active ? "var(--color-primary-700)" : "#444",
      fontWeight: 500,
      fontSize: "1.05rem",
      position: "relative",
      marginRight: "2.5rem",
      paddingBottom: 6,
      transition: "color 0.2s ease",
      display: "inline-block",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary-700)")}
    onMouseLeave={(e) =>
      (e.currentTarget.style.color = active ? "var(--color-primary-700)" : "#444")
    }
  >
    {children}
    <span
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        background: "var(--color-primary-700)",
        transform: active ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left",
        transition: "transform 0.3s",
      }}
    />
  </span>
);

export default function PerfilConductorV2Enhanced({ viajes, reservas }) {
  const { usuario } = useUser();
  const [perfil, setPerfil] = useState({
    nombre: "",
    whatsapp: "",
    fechaNacimiento: "",
    modeloVehiculo: "",
    descripcion: "",
    nivelExperiencia: "Novato",
    fotoURL: "",
    tasaRespuesta: 0.9,
    viajesCompletados: 10,
    viajesPublicados: 10,
    ultimoViaje: "2025-07-28",
    valoraciones: {
      conduccion: 5.0,
      puntualidad: 4.8,
      amabilidad: 5.0,
      limpieza: 4.9,
    },
  });
  const [original, setOriginal] = useState({});
  const [guardado, setGuardado] = useState(false);
  const menuItems = ["Perfil", "Vehículos", "Reservas"];
  const [activeTab, setActiveTab] = useState(menuItems[0]);
  const [editMode, setEditMode] = useState(false);

  // Hook de foto
  const [previewPhoto, handlePhotoSelected] = usePhotoUpload(perfil.fotoURL);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      const ref = doc(db, "usuarios", usuario.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPerfil((prev) => ({ ...prev, ...data }));
        setOriginal({ ...data });
        // Si el data.fotoURL existe, actualiza el previewPhoto
        if (data.fotoURL) {
          // Si quieres forzar el preview, puedes llamar al handler con un objeto falso,
          // pero realmente deberías setPreviewPhoto(data.fotoURL);
          setTimeout(() => {
            // Sincroniza el hook si el usuario cambia de perfil con foto
            handlePhotoSelected({ target: { files: [] } });
          }, 0);
        }
      } else {
        const nombreFallback = usuario?.displayName || "";
        setPerfil((prev) => ({
          ...prev,
          nombre: nombreFallback,
        }));
        setOriginal({
          nombre: nombreFallback,
        });
      }
    })();
    // eslint-disable-next-line
  }, [usuario]);

  const handlePerfilChange = (field, value) =>
    setPerfil((prev) => ({ ...prev, [field]: value }));

  const handleGuardar = async () => {
    if (!usuario) return;
    await setDoc(doc(db, "usuarios", usuario.uid), perfil, { merge: true });
    setGuardado(true);
    setOriginal(perfil);
    setEditMode(false);
    setTimeout(() => setGuardado(false), 2500);
  };

  const handleCancelar = () => {
    setPerfil(original);
    setEditMode(false);
    if (original.fotoURL) {
      setTimeout(() => {
        handlePhotoSelected({ target: { files: [] } });
      }, 0);
    }
  };

  const completadosPercent =
    perfil.viajesPublicados
      ? Math.round((perfil.viajesCompletados / perfil.viajesPublicados) * 100)
      : 0;

  // Valoraciones siempre seguras
  const valoraciones = perfil.valoraciones || {
    conduccion: 0,
    puntualidad: 0,
    amabilidad: 0,
    limpieza: 0,
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Tabs horizontales */}
      <nav
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid #e2e8f0",
          paddingLeft: "2rem",
          paddingTop: "2rem",
          marginBottom: "2rem",
        }}
      >
        {menuItems.map((item) => (
          <TabButton
            key={item}
            active={activeTab === item}
            onClick={() => {
              setActiveTab(item);
              setEditMode(false);
            }}
          >
            {item}
          </TabButton>
        ))}
      </nav>
      <main className="max-w-3xl mx-auto p-6">
        <ActionBar
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onSave={handleGuardar}
          onCancel={handleCancelar}
          guardado={guardado}
        />
        {activeTab === "Perfil" && (
          <section>
            <h1 className="text-2xl font-bold mb-6">Perfil</h1>
            {/* Encabezado */}
            <div
              style={{
                display: "flex",
                gap: 24,
                alignItems: "flex-start",
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 98,
                    height: 98,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#f0f4f8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {previewPhoto ? (
                    <img
                      src={previewPhoto}
                      alt="Foto de perfil"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: "#64748b" }}>Sin foto</div>
                  )}
                </div>
                {editMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelected}
                    style={{
                      position: "absolute",
                      bottom: -6,
                      right: -6,
                      background: "var(--color-surface)",
                      borderRadius: "50%",
                      padding: 4,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                    title="Cambiar foto"
                    aria-label="Cambiar foto de perfil"
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {perfil.nombre || "Sin nombre"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <Badge variant="verificado">Conductor verificado</Badge>
                    <Badge variant="viajes">100% viajes completados</Badge>
                    <Badge variant="rapido">Responde rápido</Badge>
                  </div>
                </div>
                <div style={{ fontSize: "0.8rem", marginTop: 4, color: "#555" }}>
                  Ãšltimo viaje: {perfil.ultimoViaje} â€¢ Tasa de respuesta:{" "}
                  {Math.round((perfil.tasaRespuesta || 0) * 100)}%
                </div>
              </div>
            </div>
            {/* Grid datos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px 24px",
                alignItems: "start",
              }}
            >
              <InputField
                label="WhatsApp"
                type="text"
                value={perfil.whatsapp || ""}
                onChange={(e) => handlePerfilChange("whatsapp", e.target.value)}
                readOnly={!editMode}
                placeholder="Sin datos"
              />
              <InputField
                label="Fecha de nacimiento"
                type="date"
                value={perfil.fechaNacimiento || ""}
                onChange={(e) => handlePerfilChange("fechaNacimiento", e.target.value)}
                readOnly={!editMode}
                placeholder="Sin datos"
              />
              <InputField
                label="Modelo de Vehículo"
                type="text"
                value={perfil.modeloVehiculo || ""}
                onChange={(e) => handlePerfilChange("modeloVehiculo", e.target.value)}
                readOnly={!editMode}
                placeholder="Sin datos"
              />
              <InputField
                label="Nivel de Experiencia"
                type="select"
                value={perfil.nivelExperiencia || "Novato"}
                onChange={(e) => handlePerfilChange("nivelExperiencia", e.target.value)}
                readOnly={!editMode}
                options={["Novato", "Intermedio", "Experto"]}
              />
              <div style={{ gridColumn: "1 / span 2" }}>
                <InputField
                  label="Acerca de mí"
                  type="textarea"
                  value={perfil.descripcion || ""}
                  onChange={(e) => handlePerfilChange("descripcion", e.target.value)}
                  readOnly={!editMode}
                  placeholder="Sin datos"
                />
              </div>
              {/* Valoraciones */}
              <div style={{ gridColumn: "1 / span 2", marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Valoraciones
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <RatingRow label="Conducción" value={valoraciones.conduccion} />
                    <RatingRow label="Puntualidad" value={valoraciones.puntualidad} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <RatingRow label="Amabilidad" value={valoraciones.amabilidad} />
                    <RatingRow label="Limpieza" value={valoraciones.limpieza} />
                  </div>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#555" }}>
                  {perfil.viajesCompletados} viajes completados â€¢ {completadosPercent}% éxito
                </div>
              </div>
            </div>
          </section>
        )}
        {activeTab === "Vehículos" && (
          <section>
            <h1 className="text-2xl font-bold mb-4">Mis Vehículos</h1>
            <VehiculosConductor viajes={viajes} reservas={reservas} />
          </section>
        )}
        {activeTab === "Reservas" && (
          <section>
            <h1 className="text-2xl font-bold mb-4">Reservas Recibidas</h1>
            <ReservasRecibidas viajes={viajes} reservas={reservas} />
          </section>
        )}
      </main>
    </div>
  );
}
