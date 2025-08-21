import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import VehiculosConductor from "./VehiculosConductor";
import ReservasRecibidas from "./ReservasRecibidas";

// Span con hover y subrayado animado (mismo estilo usado en VehiculosConductor)
const HoverSpan = ({ children, onClick }) => (
  <span
    onClick={onClick}
    className="cursor-pointer relative font-medium"
    style={{ color: '#444', fontSize: '1.05rem' }}
    onMouseEnter={e => {
      e.currentTarget.style.color = 'var(--color-primary-700)';
      const u = e.currentTarget.querySelector('.underline');
      if (u) u.style.transform = 'scaleX(1)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.color = '#444';
      const u = e.currentTarget.querySelector('.underline');
      if (u) u.style.transform = 'scaleX(0)';
    }}
  >
    {children}
    <span
      className="underline absolute bottom-[-4px] left-0 right-0 h-0.5 bg-[var(--color-primary-700)]"
      style={{ transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.3s ease' }}
    />
  </span>
);

export default function PerfilConductorV2({ viajes, reservas, modo = "editar" }) {
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
    setTimeout(() => setGuardado(false), 2500);
  };

  const handleCancelar = () => setPerfil(original);

  // Estilo para inputs y visualización
  const fieldStyle = {
    minHeight: '40px',
    fontSize: '1.05rem',
    backgroundColor: modo === "ver" ? "var(--color-bg)" : undefined,
    border: modo === "ver" ? "none" : undefined,
    pointerEvents: modo === "ver" ? "none" : undefined
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Menú lateral */}
      <aside className="w-48 bg-white border-r shadow-sm p-4">
        {menuItems.map(item => (
          <span
            key={item}
            onClick={() => setActiveTab(item)}
            style={{
              display: 'block', marginBottom: '1rem', cursor: 'pointer',
              color: activeTab === item ? 'var(--color-primary-700)' : '#444',
              fontWeight: 500, fontSize: '1.05rem', position: 'relative', transition: 'color 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary-700)'}
            onMouseLeave={e => e.currentTarget.style.color = activeTab === item ? 'var(--color-primary-700)' : '#444'}
          >
            {item}
            <span
              style={{
                display:'block',height:'2px',backgroundColor:'var(--color-primary-700)',position:'absolute',bottom:-4,
                left:0,right:0,transform: activeTab===item?'scaleX(1)':'scaleX(0)',transformOrigin:'left',transition:'transform 0.3s ease'
              }}
            />
          </span>
        ))}
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-6">
        {activeTab === 'Perfil' && (
          <section className="space-y-6">
            <h1 className="text-2xl font-bold">Editar Perfil</h1>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">WhatsApp</label>
                {modo === "editar" ? (
                  <input
                    type="text"
                    value={perfil.whatsapp}
                    onChange={e => handlePerfilChange('whatsapp', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    style={fieldStyle}
                  />
                ) : (
                  <div className="mt-1 block w-full rounded-md shadow-sm" style={fieldStyle}>
                    {perfil.whatsapp || <span className="text-gray-400">Sin datos</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Fecha de nacimiento</label>
                {modo === "editar" ? (
                  <input
                    type="date"
                    value={perfil.fechaNacimiento}
                    onChange={e => handlePerfilChange('fechaNacimiento', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    style={fieldStyle}
                  />
                ) : (
                  <div className="mt-1 block w-full rounded-md shadow-sm" style={fieldStyle}>
                    {perfil.fechaNacimiento || <span className="text-gray-400">Sin datos</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Modelo de Vehículo</label>
                {modo === "editar" ? (
                  <input
                    type="text"
                    value={perfil.modeloVehiculo}
                    onChange={e => handlePerfilChange('modeloVehiculo', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    style={fieldStyle}
                  />
                ) : (
                  <div className="mt-1 block w-full rounded-md shadow-sm" style={fieldStyle}>
                    {perfil.modeloVehiculo || <span className="text-gray-400">Sin datos</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Nivel de Experiencia</label>
                {modo === "editar" ? (
                  <select
                    value={perfil.nivelExperiencia}
                    onChange={e => handlePerfilChange('nivelExperiencia', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    style={fieldStyle}
                  >
                    <option>Novato</option>
                    <option>Intermedio</option>
                    <option>Experto</option>
                  </select>
                ) : (
                  <div className="mt-1 block w-full rounded-md shadow-sm" style={fieldStyle}>
                    {perfil.nivelExperiencia || <span className="text-gray-400">Sin datos</span>}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600">Acerca de mí</label>
                {modo === "editar" ? (
                  <textarea
                    rows={3}
                    value={perfil.descripcion}
                    onChange={e => handlePerfilChange('descripcion', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    style={fieldStyle}
                  />
                ) : (
                  <div className="mt-1 block w-full rounded-md shadow-sm" style={{ ...fieldStyle, minHeight: '60px' }}>
                    {perfil.descripcion || <span className="text-gray-400">Sin datos</span>}
                  </div>
                )}
              </div>
            </div>
            {modo === "editar" && (
              <div className="flex items-center gap-4">
                <HoverSpan onClick={handleCancelar}>Cancelar</HoverSpan>
                <HoverSpan onClick={handleGuardar}>Guardar Perfil</HoverSpan>
                {guardado && <p className="text-green-600">Cambios guardados.</p>}
              </div>
            )}
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
