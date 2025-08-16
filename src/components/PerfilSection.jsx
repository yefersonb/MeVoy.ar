// src/components/PerfilSection.jsx

/*
  STRICT FORMATTING RULES: DO NOT CHANGE THE FORMATTING OF THIS FILE — IT MAY LOOK NON STANDARD TO YOU BUT IT HAS MEANING TO US
*/

import React, { useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useVerificacionConductor } from '../hooks/useVerificacionConductor';


// UI
import InputField from './InputField';
import Badge from './Badge';
import RatingRow from './RatingRow';
import ActionBar from './ActionBar';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';
import Avatar from "./ui/Avatar"


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

// ESTO ES LO QUE HAY Q SACAR SI NO QUEDA BIEN % de perfil (suma foto, bio, whatsapp, fecha, vehículo y % de verificación de documentos)
const { percent: _verDocPct } = useVerificacionConductor(usuario?.uid);
const hasFoto = !!(preview || perfil.fotoURL || usuario?.photoURL);
const perfilPercent = (() => {
  let p = 0;
  if (hasFoto) p += 15;                       // foto
  if (perfil?.descripcion) p += 10;           // bio
  if (perfil?.whatsapp) p += 10;              // contacto
  if (perfil?.fechaNacimiento) p += 10;       // fecha nac.
  if (vehiculos && vehiculos.length > 0) p += 20; // ≥1 vehículo
  const docs = Math.max(0, Math.min(100, _verDocPct || 0));
  p += Math.round(docs * 0.35);               // documentos (DNI/licencia/selfie) hasta +35
  return Math.min(100, p);
})();

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
    <div>
      <div>
        <ActionBar
          editMode={editMode}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          guardado={guardado}
        />

        {/* Nueva tarjeta de perfil */}
        <div style={{width: "100%", padding: "0.5rem", display: "flex", gap: "1rem"}}>
          {/* Foto de perfil */}

          <div style={{ width: "40px", height: "40px", aspectRatio: "1 / 1", borderRadius: "50%", overflow: "hidden" }}>
            <Avatar />
          </div>

          {/* Detalles */}
          <div>
            <div style={{display: "flex", flexDirection: "column"}}>
              <div style={{fontSize: "2rem", marginBottom: "1rem"}}>{perfil.nombre}</div>
              <div style={{fontSize: "1.2rem", marginBottom: "1rem", maxWidth: "60%"}}> {perfil.descripcion || ''} </div>
            </div>
            <div style={{display: "flex", gap: "1rem"}}>
              {/* ToDo: Generar dinámicamente: */}
              <Badge variant="verificado">Conductor verificado</Badge>
              <Badge variant="viajes">{completadosPercent === 100 ? '100% viajes completados' : `${completadosPercent}% viajes completados`} </Badge>
              <Badge variant="rapido">Responde rápido</Badge>
            </div>
          </div>
        </div>

        {/* Viaja tarjeta de perfil (Nos vamos a deshacer de ella pronto) */}
        <div style={{marginTop: "5rem"}}>
          <div>
            <div className="primary" style={{ display: "flex" }}>
              <div style={{ width: 98, height: 98, minWidth: 98, minHeight: 98 }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
                  { 
                    avatarSrc ? 
                      (<img src={avatarSrc} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>) 
                    : 
                      (<div> Sin foto </div>)
                  }

                  { 
                    uploading &&
                      (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', }}>
                          <LoadingSpinner size="sm" />
                        </div>
                      )
                  }
                </div>

                {
                  editMode && (
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
              <div>
                  <InputField
                    label="" // Acerca de mi... pero mejor que no diga nada por ahora.
                    type="textarea"
                    value={perfil.descripcion || ''}
                    onChange={(e) => onPerfilChange('descripcion', e.target.value)}
                    readOnly={!editMode}
                    placeholder="Cuéntanos algo sobre ti, tus gustos, música favorita, etc."
                  />
                </div>
              {/* Información del usuario */}
              <div >
                <div>
                  <h2>
                      {perfil.nombre || usuario?.displayName || 'Sin nombre'}
  			  {perfil.nombre || usuario?.displayName || 'Sin nombre'}
 			 <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
			    {perfilPercent < 100 ? (
   			   <button
   			     onClick={() => { window.location.hash = 'verificacion'; }}
    			    style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, cursor: 'pointer' }}
   			     title="Completá tu verificación"
   					   >
 			       <Badge variant="viajes">{`Perfil ${perfilPercent}%`}</Badge>
 				     </button>
  					  ) : (
  			    <Badge variant="viajes">{`Perfil ${perfilPercent}%`}</Badge>
 				   )}
			  </span>
                  </h2>
                  <div style={{display: "flex", alignItems: "center", gap: "5px"}}>
                    <Badge variant="verificado">Conductor verificado</Badge>
                    <Badge variant="viajes">{completadosPercent === 100 ? '100% viajes completados' : `${completadosPercent}% viajes completados`} </Badge>
                    <Badge variant="rapido">Responde rápido</Badge>
                  </div>
                  <div>
                    <table>
                      <tr>
                        <td style={{fontWeight: "600"}}>Viajes:</td>
                        <td style={{width: "1rem"}}></td>
                        <td>{"Nunca viajó"}</td>
                      </tr>
                      <tr>
                        <td style={{fontWeight: "600"}}>Último viaje:</td>
                        <td style={{width: "1rem"}}></td>
                        <td>{perfil.ultimoViaje || 'No tiene viajes'}</td>
                      </tr>
                      <tr>
                        <td style={{fontWeight: "600"}}>Tasa de respuesta: </td>
                        <td style={{width: "1rem"}}></td>
                        <td>{Math.round((perfil.tasaRespuesta) * 100) || "--"}%</td>
                      </tr>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div>
              <div>
                <h3>
                  Información Personal
                </h3>
                <div>
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
              </div>

              {/* Valoraciones */}
              <div>
                <h3>
                  Valoraciones de Conductores
                </h3>
                <div>
                  <div>
                    <RatingRow label="Conducción" value={valoraciones.conduccion} />
                    <RatingRow label="Puntualidad" value={valoraciones.puntualidad} />
                  </div>
                  <div>
                    <RatingRow label="Amabilidad" value={valoraciones.amabilidad} />
                    <RatingRow label="Limpieza" value={valoraciones.limpieza} />
                  </div>
                </div>
                
                <div>
                  <div>
                    <div>
                      <span>{perfil.viajesCompletados || 0} viajes completados</span>
                    </div>
                    <div>
                      {completadosPercent}% de éxito
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehículos */}
              <div>
                <h3> Mis Vehículos </h3>
                {loadingVehiculos ? (
                  <div>
                    <LoadingSpinner size="md" text="Cargando vehículos..." />
                  </div>
                ) : vehiculos.length === 0 ? (
                  <div>
                    <p>No tienes vehículos registrados</p>
                    <p>
                      Agrega tu primer vehículo en la pestaña <strong>Vehículos</strong> para comenzar a ofrecer viajes.
                    </p>
                  </div>
                )
                :
                (
                  <div>
                    {
                      vehiculos.map
                      (
                        (vehiculo) =>
                        (
                          <div key={vehiculo.id}>
                            <div>
                              <span>🚗</span>
                            </div>
                            <div>
                              <div> {vehiculo.modelo || 'Sin modelo especificado'} </div>
                              {
                                vehiculo.patente &&
                                (
                                  <div> Patente: {vehiculo.patente} </div>
                                )
                              }
                            </div>
                          </div>
                        )
                      )
                    }
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