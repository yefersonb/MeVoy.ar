// PerfilConductorV2Enhanced.jsx
import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import VehiculosConductor from "./VehiculosConductor";
import ReservasRecibidas from "./ReservasRecibidas";

// Badge pequeño
const Badge = ({ children, bg = "#eef2f7", color = "#1f2d3d" }) => (
  <span
    style={{
      display: "inline-block",
      background: bg,
      color,
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: "0.65rem",
      fontWeight: 600,
      marginRight: 6,
      marginBottom: 4,
    }}
  >
    {children}
  </span>
);

// Valoraciones desglosadas
const RatingRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
    <div style={{ fontSize: "0.85rem" }}>{label}</div>
    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{value.toFixed(1)}</div>
  </div>
);

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

export default function PerfilConductorV2({ viajes, reservas }) {
  const { usuario } = useUser();
  const [perfil, setPerfil] = useState({
    nombre: "",
    whatsapp: "",
    fechaNacimiento: "",
    modeloVehiculo: "",
    descripcion: "",
    nivelExperiencia: "Novato",
    fotoURL: "",
    tasaRespuesta: 0.9, // mock
    viajesCompletados: 10, // mock
    viajesPublicados: 10, // mock
    ultimoViaje: "2025-07-28", // mock
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
  const [previewPhoto, setPreviewPhoto] = useState("");

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      const ref = doc(db, "usuarios", usuario.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPerfil((prev) => ({ ...prev, ...data }));
        setOriginal({ ...data });
        if (data.fotoURL) setPreviewPhoto(data.fotoURL);
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
    if (original.fotoURL) setPreviewPhoto(original.fotoURL);
  };

  const onPhotoSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewPhoto(url);
    // Aquí deberías subir a Firebase Storage y obtener URL final.
    setPerfil((prev) => ({ ...prev, fotoURL: url }));
  };

  const inputStyle = {
    width: "100%",
    fontSize: "1rem",
    background: "transparent",
    color: "#222",
    border: editMode ? "1px solid #e2e8f0" : "none",
    outline: "none",
    borderRadius: 5,
    padding: "6px 8px",
    transition: "border 0.15s",
    boxShadow: "none",
    appearance: "none",
    minHeight: 38,
    cursor: editMode ? "text" : "default",
  };

  const labelStyle = {
    fontSize: "0.94rem",
    color: "#64748b",
    fontWeight: 500,
    marginBottom: 3,
    display: "block",
  };

  const completadosPercent =
    perfil.viajesPublicados
      ? Math.round((perfil.viajesCompletados / perfil.viajesPublicados) * 100)
      : 0;

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
        {activeTab === "Perfil" && (
          <section>
            <h1 className="text-2xl font-bold mb-6">Perfil</h1>

            {/* Encabezado con foto, nombre, badges y actividad */}
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
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#f0f4f8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#64748b",
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
                    <div>Sin foto</div>
                  )}
                </div>
                {editMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPhotoSelected}
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
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {perfil.nombre || "Sin nombre"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <Badge>Conductor verificado</Badge>
                    <Badge>100% viajes completados</Badge>
                    <Badge>Responde rápido</Badge>
                  </div>
                </div>
                <div style={{ fontSize: "0.8rem", marginTop: 4, color: "#555" }}>
                  Ãšltimo viaje: {perfil.ultimoViaje} â€¢ Tasa de respuesta:{" "}
                  {Math.round((perfil.tasaRespuesta || 0) * 100)}%
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      padding: "6px 14px",
                      background: "var(--color-primary-700)",
                      color: "var(--color-surface)",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Editar
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleGuardar}
                      style={{
                        padding: "6px 14px",
                        background: "#059669",
                        color: "var(--color-surface)",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={handleCancelar}
                      style={{
                        padding: "6px 14px",
                        background: "#64748b",
                        color: "var(--color-surface)",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Grid de datos y descripción */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "32px 40px",
                alignItems: "start",
              }}
            >
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input
                  type="text"
                  value={perfil.whatsapp || ""}
                  onChange={(e) =>
                    handlePerfilChange("whatsapp", e.target.value)
                  }
                  style={inputStyle}
                  readOnly={!editMode}
                  tabIndex={editMode ? 0 : -1}
                  placeholder="Sin datos"
                />
              </div>
              <div>
                <label style={labelStyle}>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={perfil.fechaNacimiento || ""}
                  onChange={(e) =>
                    handlePerfilChange("fechaNacimiento", e.target.value)
                  }
                  style={inputStyle}
                  readOnly={!editMode}
                  tabIndex={editMode ? 0 : -1}
                  placeholder="Sin datos"
                />
              </div>
              <div>
                <label style={labelStyle}>Modelo de Vehículo</label>
                <input
                  type="text"
                  value={perfil.modeloVehiculo || ""}
                  onChange={(e) =>
                    handlePerfilChange("modeloVehiculo", e.target.value)
                  }
                  style={inputStyle}
                  readOnly={!editMode}
                  tabIndex={editMode ? 0 : -1}
                  placeholder="Sin datos"
                />
              </div>
              <div>
                <label style={labelStyle}>Nivel de Experiencia</label>
                <select
                  value={perfil.nivelExperiencia || "Novato"}
                  onChange={(e) =>
                    handlePerfilChange("nivelExperiencia", e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    cursor: editMode ? "pointer" : "default",
                  }}
                  disabled={!editMode}
                  tabIndex={editMode ? 0 : -1}
                >
                  <option>Novato</option>
                  <option>Intermedio</option>
                  <option>Experto</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / span 2" }}>
                <label style={labelStyle}>Acerca de mí</label>
                <textarea
                  rows={3}
                  value={perfil.descripcion || ""}
                  onChange={(e) =>
                    handlePerfilChange("descripcion", e.target.value)
                  }
                  style={{ ...inputStyle, resize: "vertical" }}
                  readOnly={!editMode}
                  tabIndex={editMode ? 0 : -1}
                  placeholder="Sin datos"
                />
              </div>

              {/* Desglose de valoraciones */}
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
                    <RatingRow label="Conducción" value={perfil.valoraciones.conduccion} />
                    <RatingRow label="Puntualidad" value={perfil.valoraciones.puntualidad} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <RatingRow label="Amabilidad" value={perfil.valoraciones.amabilidad} />
                    <RatingRow label="Limpieza" value={perfil.valoraciones.limpieza} />
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
            <h1 className="text-2xl font-bold mb-4">
              Reservas Recibidas
            </h1>
            <ReservasRecibidas viajes={viajes} reservas={reservas} />
          </section>
        )}
      </main>
    </div>
  );
}

