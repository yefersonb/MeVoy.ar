// src/components/PerfilViajeroPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../contexts/UserContext";
import InputField from "./ui/InputField";
import ActionBar from "./ActionBar";
import LoadingSpinner from "./common/LoadingSpinner";
import ErrorMessage from "./common/ErrorMessage";
import Badge from "./Badge";
import RatingRow from "./RatingRow";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import usePhotoUpload from "../hooks/usePhotoUpload";
import useHashSection from "../hooks/useHashSection";

// Reutilizado estilo de pestañas tipo conductor
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

const defaultPerfil = {
  nombre: "",
  whatsapp: "",
  email: "",
  descripcion: "",
  fotoURL: "",
  direccion: "",
  fechaNacimiento: "",
  viajesCompletados: 0,
  valoraciones: {
    amabilidad: 0,
    puntualidad: 0,
    comunicacion: 0,
  },
};

// calcula edad desde fecha YYYY-MM-DD o ISO
const calcularEdad = (fechaStr) => {
  if (!fechaStr) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaStr);
  if (isNaN(nacimiento)) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

export default function PerfilViajeroPage() {
  const { usuario } = useUser();

  // Hash â†” pestaña (por si querés linkear directo)
  const section = useHashSection();
  const tabFromHash = (h) =>
    ({
      perfil: "Perfil",
      "datos-de-pago": "Datos de pago",
      "viajes-frecuentes": "Viajes frecuentes",
    }[h] || "Perfil");

  const hashFromTab = (t) =>
    ({
      Perfil: "perfil",
      "Datos de pago": "datos-de-pago",
      "Viajes frecuentes": "viajes-frecuentes",
    }[t] || "perfil");

  const [activeTab, setActiveTab] = useState(tabFromHash(section));
  const [perfil, setPerfil] = useState(defaultPerfil);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const { preview, uploading, handlePhotoSelected } = usePhotoUpload(
    usuario?.uid || ""
  );

  // Viajes frecuentes (placeholder; reemplazar con lógica real)
  const [viajesFrecuentes, setViajesFrecuentes] = useState([]);
  // Métodos de pago (placeholder)
  const [metodosPago, setMetodosPago] = useState([]);

  // Carga perfil
  const loadPerfil = useCallback(async () => {
    if (!usuario) return;
    setLoadingPerfil(true);
    setErrorPerfil(null);
    try {
      const ref = doc(db, "usuarios", usuario.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPerfil({
          nombre: data.nombre || usuario.displayName || "",
          whatsapp: data.whatsapp || "",
          email: data.email || usuario.email || "",
          descripcion: data.descripcion || "",
          fotoURL: data.fotoURL || usuario.photoURL || "",
          direccion: data.direccion || "",
          fechaNacimiento: data.fechaNacimiento || "",
          viajesCompletados: data.viajesCompletados || 0,
          valoraciones: {
            amabilidad: data.valoraciones?.amabilidad ?? 0,
            puntualidad: data.valoraciones?.puntualidad ?? 0,
            comunicacion: data.valoraciones?.comunicacion ?? 0,
          },
        });
      } else {
        setPerfil((prev) => ({
          ...prev,
          nombre: usuario?.displayName || "",
          email: usuario?.email || "",
          fotoURL: usuario?.photoURL || "",
        }));
      }

      // Simulado (reemplazar con real)
      setViajesFrecuentes([
        { id: "vf1", origen: "Posadas", destino: "Iguazú", frecuencia: "Semanal" },
        { id: "vf2", origen: "Oberá", destino: "Posadas", frecuencia: "Mensual" },
      ]);
      setMetodosPago([
        { id: "p1", tipo: "Tarjeta de crédito", detalle: "**** **** **** 4242", vencimiento: "12/25" },
      ]);
    } catch (e) {
      console.error("Error cargando perfil viajero:", e);
      setErrorPerfil("No se pudo cargar el perfil.");
    } finally {
      setLoadingPerfil(false);
    }
  }, [usuario]);

  useEffect(() => {
    loadPerfil();
  }, [loadPerfil]);

  // Sincroniza cuando cambia el hash
  useEffect(() => {
    const next = tabFromHash(section);
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line
  }, [section]);

  const onPerfilChange = (field, value) =>
    setPerfil((p) => ({ ...p, [field]: value }));

  const handleGuardar = async () => {
    if (!usuario) return;
    try {
      await setDoc(doc(db, "usuarios", usuario.uid), perfil, { merge: true });
      setGuardado(true);
      setEditMode(false);
      setTimeout(() => setGuardado(false), 2000);
    } catch (e) {
      console.error("Error guardando perfil viajero:", e);
      alert("No se pudo guardar el perfil.");
    }
  };

  const handlePhoto = async (e) => {
    const url = await handlePhotoSelected(e);
    if (url) {
      setPerfil((p) => ({ ...p, fotoURL: url }));
      if (usuario) {
        await setDoc(doc(db, "usuarios", usuario.uid), { fotoURL: url }, { merge: true });
      }
    }
  };

  // Helpers para badges con tooltip
  const badgeProps = {
    style: { cursor: "default" },
  };

  const edad = calcularEdad(perfil.fechaNacimiento);
  const edadTexto = edad != null ? ` (${edad} años)` : "";

  return (
    <div className="bg-gray-50 min-h-screen">
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
        {["Perfil", "Datos de pago", "Viajes frecuentes"].map((it) => (
          <TabButton
            key={it}
            active={activeTab === it}
            onClick={() => {
              setActiveTab(it);
              window.location.hash = hashFromTab(it); // â† actualiza hash
              setEditMode(false);
            }}
          >
            {it}
          </TabButton>
        ))}
      </nav>

      <main className="max-w-3xl mx-auto p-6">
        {activeTab === "Perfil" && (
          <section>
            <h1 className="text-2xl font-bold mb-4">Perfil del Viajero</h1>

            <ActionBar
              editMode={editMode}
              onEdit={() => setEditMode(true)}
              onSave={handleGuardar}
              onCancel={() => {
                loadPerfil();
                setEditMode(false);
              }}
              guardado={guardado}
            />

            {loadingPerfil && (
              <LoadingSpinner size="md" text="Cargando perfil..." />
            )}
            {errorPerfil && <ErrorMessage error={errorPerfil} />}

            <div
              className="flex"
              style={{
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 98,
                  height: 98,
                  minWidth: 98,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#f0f4f8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {preview || perfil.fotoURL ? (
                    <img
                      src={preview || perfil.fotoURL}
                      alt="Foto"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Sin foto
                    </div>
                  )}
                  {uploading && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                      }}
                    >
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>
                {editMode && (
                  <label
                    style={{
                      position: "absolute",
                      bottom: -6,
                      right: -6,
                      background: "var(--color-surface)",
                      borderRadius: "50%",
                      padding: 6,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label="Cambiar foto de perfil"
                    title="Cambiar foto"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhoto}
                      disabled={uploading}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                      }}
                    />
                    <div style={{ fontSize: 14, lineHeight: 1 }}>âœŽ</div>
                  </label>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {perfil.nombre || "Sin nombre"}
                    {edadTexto}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <Badge style={{ cursor: "default" }} title="Viajero activo">
                      Viajero activo
                    </Badge>
                    <Badge style={{ cursor: "default" }} title="Cantidad de viajes compartidos">
                      {perfil.viajesCompletados} viajes
                    </Badge>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    marginTop: 8,
                    color: "#555",
                    lineHeight: 1.2,
                  }}
                >
                  {perfil.email}{" "}
                  {perfil.whatsapp && <>â€¢ WhatsApp: {perfil.whatsapp}</>}{" "}
                  {perfil.direccion && <>â€¢ {perfil.direccion}</>}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px 16px",
                marginBottom: 12,
              }}
            >
              <InputField
                label="Nombre"
                type="text"
                value={perfil.nombre || ""}
                onChange={(e) => onPerfilChange("nombre", e.target.value)}
                readOnly={!editMode}
                placeholder="Tu nombre"
              />
              <InputField
                label="WhatsApp"
                type="text"
                value={perfil.whatsapp || ""}
                onChange={(e) => onPerfilChange("whatsapp", e.target.value)}
                readOnly={!editMode}
                placeholder="Tu WhatsApp"
              />
              <InputField
                label="Email"
                type="email"
                value={perfil.email || ""}
                onChange={(e) => onPerfilChange("email", e.target.value)}
                readOnly={!editMode}
                placeholder="Tu email"
              />
              <InputField
                label="Dirección"
                type="text"
                value={perfil.direccion || ""}
                onChange={(e) => onPerfilChange("direccion", e.target.value)}
                readOnly={!editMode}
                placeholder="Tu dirección"
              />
              <div style={{ gridColumn: "1 / span 4" }}>
                <InputField
                  label="Acerca de mí"
                  type="textarea"
                  value={perfil.descripcion || ""}
                  onChange={(e) => onPerfilChange("descripcion", e.target.value)}
                  readOnly={!editMode}
                  placeholder="Contanos algo sobre vos"
                />
              </div>
            </div>

            {/* Valoraciones en recuadro */}
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  border: `1px solid #e2e8f0`,
                  borderRadius: 10,
                  padding: 16,
                  background: "var(--color-surface)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 8,
                    fontSize: 16,
                  }}
                >
                  Valoraciones
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <RatingRow label="Amabilidad" value={perfil.valoraciones.amabilidad} />
                    <RatingRow label="Puntualidad" value={perfil.valoraciones.puntualidad} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <RatingRow label="Comunicación" value={perfil.valoraciones.comunicacion} />
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "#555" }}>
                  {perfil.viajesCompletados} viajes completados
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "Datos de pago" && (
          <section>
            <h1 className="text-2xl font-bold mb-4">Datos de pago</h1>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                background: "var(--color-surface)",
              }}
            >
              {metodosPago.length === 0 ? (
                <div>No tenés métodos de pago guardados.</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {metodosPago.map((m) => (
                    <li
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 6,
                        background: "#f9fafe",
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.tipo}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>
                          {m.detalle} â€¢ Vence {m.vencimiento}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={{
                            padding: "6px 14px",
                            background: "#f1f5f9",
                            border: "1px solid var(--color-primary-700)",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            color: "var(--color-primary-700)",
                            fontWeight: 600,
                          }}
                        >
                          Editar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                style={{
                  marginTop: 6,
                  padding: "10px 16px",
                  background: "var(--color-primary-700)",
                  color: "var(--color-surface)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Agregar método de pago
              </button>
            </div>
          </section>
        )}

        {activeTab === "Viajes frecuentes" && (
          <section>
            <h1 className="text-2xl font-bold mb-4">Viajes frecuentes</h1>
            {viajesFrecuentes.length === 0 ? (
              <div>No tenés viajes frecuentes aún.</div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                {viajesFrecuentes.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--color-surface)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {v.origen} â†’ {v.destino}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        {v.frecuencia}
                      </div>
                    </div>
                    <button
                      style={{
                        padding: "8px 14px",
                        background: "var(--color-primary-700)",
                        color: "var(--color-surface)",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Ver detalles
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

