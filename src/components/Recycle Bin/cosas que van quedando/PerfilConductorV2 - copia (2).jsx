import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import VehiculosConductor from "./VehiculosConductor";
import ReservasRecibidas from "./ReservasRecibidas";

// Tab horizontal con hover y subrayado animado
const TabButton = ({ active, children, onClick }) => (
  <span
    onClick={onClick}
    style={{
      cursor: 'pointer',
      color: active ? 'var(--color-primary-700)' : '#444',
      fontWeight: 500,
      fontSize: '1.05rem',
      position: 'relative',
      marginRight: '2.5rem',
      paddingBottom: 6,
      transition: 'color 0.2s ease',
      display: 'inline-block',
    }}
    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary-700)'}
    onMouseLeave={e => e.currentTarget.style.color = active ? 'var(--color-primary-700)' : '#444'}
  >
    {children}
    <span
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        background: 'var(--color-primary-700)',
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left',
        transition: 'transform 0.3s'
      }}
    />
  </span>
);

export default function PerfilConductorV2({ viajes, reservas }) {
  const { usuario } = useUser();
  const [perfil, setPerfil] = useState({
    whatsapp: "",
    fechaNacimiento: "",
    modeloVehiculo: "",
    descripcion: "",
    nivelExperiencia: "Novato"
  });
  const [original, setOriginal] = useState({});
  const [guardado, setGuardado] = useState(false);
  const menuItems = ["Perfil", "Vehículos", "Reservas"];
  const [activeTab, setActiveTab] = useState(menuItems[0]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      const ref = doc(db, "usuarios", usuario.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPerfil(data);
        setOriginal(data);
      }
    })();
  }, [usuario]);

  const handlePerfilChange = (field, value) => setPerfil(prev => ({ ...prev, [field]: value }));

  const handleGuardar = async () => {
    await setDoc(doc(db, "usuarios", usuario.uid), perfil, { merge: true });
    setGuardado(true);
    setOriginal(perfil);
    setEditMode(false);
    setTimeout(() => setGuardado(false), 2500);
  };

  const handleCancelar = () => {
    setPerfil(original);
    setEditMode(false);
  };

  // Estilo para inputs y visualización: discretos y sin bordes notables
  const inputStyle = {
    width: '100%',
    fontSize: '1rem',
    background: 'transparent',
    color: '#222',
    border: editMode ? '1px solid #e2e8f0' : 'none',
    outline: 'none',
    borderRadius: 5,
    padding: '6px 8px',
    transition: 'border 0.15s',
    boxShadow: 'none',
    appearance: 'none',
    minHeight: 38,
    cursor: editMode ? 'text' : 'default',
  };

  const labelStyle = {
    fontSize: '0.94rem',
    color: '#64748b',
    fontWeight: 500,
    marginBottom: 3,
    display: 'block',
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Tabs horizontales */}
      <nav style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid #e2e8f0',
        paddingLeft: '2rem',
        paddingTop: '2rem',
        marginBottom: '2rem',
      }}>
        {menuItems.map(item => (
          <TabButton
            key={item}
            active={activeTab === item}
            onClick={() => {setActiveTab(item); setEditMode(false);}}
          >
            {item}
          </TabButton>
        ))}
      </nav>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto p-6">
        {activeTab === 'Perfil' && (
          <section>
            <h1 className="text-2xl font-bold mb-6">Perfil</h1>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '32px 40px',
              alignItems: 'start'
            }}>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input
                  type="text"
                  value={perfil.whatsapp || ""}
                  onChange={e => handlePerfilChange('whatsapp', e.target.value)}
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
                  onChange={e => handlePerfilChange('fechaNacimiento', e.target.value)}
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
                  onChange={e => handlePerfilChange('modeloVehiculo', e.target.value)}
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
                  onChange={e => handlePerfilChange('nivelExperiencia', e.target.value)}
                  style={{...inputStyle, cursor: editMode ? 'pointer' : 'default'}}
                  disabled={!editMode}
                  tabIndex={editMode ? 0 : -1}
                >
                  <option>Novato</option>
                  <option>Intermedio</option>
                  <option>Experto</option>
                </select>
              </div>
              <div style={{gridColumn: '1 / span 2'}}>
                <label style={labelStyle}>Acerca de mí</label>
                <textarea
                  rows={3}
                  value={perfil.descripcion || ""}
                  onChange={e => handlePerfilChange('descripcion', e.target.value)}
                  style={{...inputStyle, resize: 'vertical'}}
                  readOnly={!editMode}
                  tabIndex={editMode ? 0 : -1}
                  placeholder="Sin datos"
                />
              </div>
            </div>
            {/* Botones */}
            <div className="flex items-center gap-4 mt-6">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    padding: '8px 18px',
                    fontWeight: 500,
                    fontSize: '1rem',
                    color: 'var(--color-surface)',
                    background: 'var(--color-primary-700)',
                    border: 'none',
                    borderRadius: 6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  Editar perfil
                </button>
              ) : (
                <>
                  <button
                    onClick={handleGuardar}
                    style={{
                      padding: '8px 18px',
                      fontWeight: 500,
                      fontSize: '1rem',
                      color: 'var(--color-surface)',
                      background: '#059669',
                      border: 'none',
                      borderRadius: 6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancelar}
                    style={{
                      padding: '8px 18px',
                      fontWeight: 500,
                      fontSize: '1rem',
                      color: 'var(--color-surface)',
                      background: '#64748b',
                      border: 'none',
                      borderRadius: 6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    Cancelar
                  </button>
                  {guardado && <p style={{ color: "#059669", fontWeight: 500, marginLeft: 16 }}>Cambios guardados.</p>}
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === 'Vehículos' && (
          <section>
            <h1 className="text-2xl font-bold mb-4">Mis Vehículos</h1>
            <VehiculosConductor viajes={viajes} reservas={reservas} />
          </section>
        )}

        {activeTab === 'Reservas' && (
          <section>
            <h1 className="text-2xl font-bold mb-4">Reservas Recibidas</h1>
            <ReservasRecibidas viajes={viajes} reservas={reservas} />
          </section>
        )}
      </main>
    </div>
  );
}
