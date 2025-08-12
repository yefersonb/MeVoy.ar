// src/components/PerfilSection.jsx
import React, { useEffect, useState, useCallback } from 'react';
import InputField from './InputField';
import Badge from './Badge';
import RatingRow from './RatingRow';
import ActionBar from './ActionBar';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const PerfilSection = ({
  usuario,
  perfil,
  loading,
  error,
  editMode,
  guardado,
  onEdit,
  onSave,
  onCancel,
  onPerfilChange,
  onPhotoSelected,
  preview,
  uploading,
}) => {
  const [vehiculos, setVehiculos] = useState([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);

  const completadosPercent = perfil.viajesPublicados
    ? Math.round((perfil.viajesCompletados / perfil.viajesPublicados) * 100)
    : 0;

  const valoraciones = perfil.valoraciones || {
    conduccion: 0,
    puntualidad: 0,
    amabilidad: 0,
    limpieza: 0,
  };

  const loadVehiculos = useCallback(async () => {
    setLoadingVehiculos(true);
    setVehiculos([]);
    if (!auth.currentUser) {
      setLoadingVehiculos(false);
      return;
    }
    try {
      const vehiculosRef = collection(
        db,
        'usuarios',
        auth.currentUser.uid,
        'vehiculos'
      );
      const snap = await getDocs(vehiculosRef);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setVehiculos(lista);
    } catch (e) {
      console.error('Error cargando vehículos en perfil:', e);
    } finally {
      setLoadingVehiculos(false);
    }
  }, []);

  useEffect(() => {
    loadVehiculos();
  }, [loadVehiculos]);

  if (loading) return <LoadingSpinner size="md" text="Cargando perfil..." />;
  if (error) return <ErrorMessage error={error} />;

  const avatarSrc = preview || perfil.fotoURL || usuario?.photoURL || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1">Mi Perfil</h1>
          <p className="text-gray-600">Gestiona tu información personal y profesional</p>
        </div>

        <ActionBar
          editMode={editMode}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          guardado={guardado}
        />

        <div className="space-y-8">
          {/* Tarjeta Principal del Perfil */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Avatar y botón de edición */}
              <div
                className="relative"
                style={{ width: 98, height: 98, minWidth: 98, minHeight: 98 }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#f0f4f8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Foto de perfil"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div className="text-xs text-gray-500">Sin foto</div>
                  )}

                  {uploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                      }}
                    >
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>

                {editMode && (
                  <label
                    style={{
                      position: 'absolute',
                      bottom: -6,
                      right: -6,
                      background: '#fff',
                      borderRadius: '50%',
                      padding: 6,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Cambiar foto de perfil"
                    title="Cambiar foto"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPhotoSelected}
                      disabled={uploading}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ fontSize: 14, lineHeight: 1 }}>✎</div>
                  </label>
                )}
              </div>

              {/* Información del usuario */}
              <div className="flex-1">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {perfil.nombre || usuario?.displayName || 'Sin nombre'}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="verificado">Conductor verificado</Badge>
                    <Badge variant="viajes">
                      {completadosPercent === 100
                        ? '100% viajes completados'
                        : `${completadosPercent}% viajes completados`}
                    </Badge>
                    <Badge variant="rapido">Responde rápido</Badge>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-4">
                      <span>
                        <strong>Último viaje:</strong> {perfil.ultimoViaje || 'N/A'}
                      </span>
                      <span>
                        <strong>Tasa de respuesta:</strong> {Math.round((perfil.tasaRespuesta || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secciones con recuadros separados */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="space-y-10">
              {/* Información Personal */}
              <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                <h3 className="text-xl font-semibold text-blue-800 mb-6 border-b-2 border-blue-300 pb-3">
                  Información Personal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="WhatsApp"
                    type="text"
                    value={perfil.whatsapp || ''}
                    onChange={(e) => onPerfilChange('whatsapp', e.target.value)}
                    readOnly={!editMode}
                    placeholder="Ingresa tu número de WhatsApp"
                  />
                  <InputField
                    label="Fecha de nacimiento"
                    type="date"
                    value={perfil.fechaNacimiento || ''}
                    onChange={(e) => onPerfilChange('fechaNacimiento', e.target.value)}
                    readOnly={!editMode}
                    placeholder="Selecciona tu fecha de nacimiento"
                  />
                </div>
                
                <div className="mt-6">
                  <InputField
                    label="Acerca de mí"
                    type="textarea"
                    value={perfil.descripcion || ''}
                    onChange={(e) => onPerfilChange('descripcion', e.target.value)}
                    readOnly={!editMode}
                    placeholder="Cuéntanos algo sobre ti, tus gustos, música favorita, etc."
                  />
                </div>
              </div>

              {/* Valoraciones */}
              <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50">
                <h3 className="text-xl font-semibold text-green-800 mb-6 border-b-2 border-green-300 pb-3">
                  Valoraciones de Conductores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <RatingRow label="Conducción" value={valoraciones.conduccion} />
                    <RatingRow label="Puntualidad" value={valoraciones.puntualidad} />
                  </div>
                  <div className="space-y-4">
                    <RatingRow label="Amabilidad" value={valoraciones.amabilidad} />
                    <RatingRow label="Limpieza" value={valoraciones.limpieza} />
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-green-200 rounded-lg border-2 border-green-400">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-green-800">
                      <span className="font-medium">{perfil.viajesCompletados || 0} viajes completados</span>
                    </div>
                    <div className="text-green-700 font-bold">
                      {completadosPercent}% de éxito
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehículos */}
              <div className="border-2 border-purple-200 rounded-xl p-6 bg-purple-50">
                <h3 className="text-xl font-semibold text-purple-800 mb-6 border-b-2 border-purple-300 pb-3">
                  Mis Vehículos
                </h3>
                {loadingVehiculos ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="md" text="Cargando vehículos..." />
                  </div>
                ) : vehiculos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-2">No tienes vehículos registrados</p>
                    <p className="text-sm text-gray-500">
                      Agrega tu primer vehículo en la pestaña <strong>Vehículos</strong> para comenzar a ofrecer viajes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehiculos.map((vehiculo) => (
                      <div
                        key={vehiculo.id}
                        className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 text-lg">🚗</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {vehiculo.modelo || 'Sin modelo especificado'}
                          </div>
                          {vehiculo.patente && (
                            <div className="text-sm text-gray-600">
                              Patente: {vehiculo.patente}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilSection;