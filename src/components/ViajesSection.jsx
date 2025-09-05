import React, { useEffect } from 'react';
import Badge from './Badge';
import ReservasRecibidas from './ReservasRecibidas';
import CozySpinner from './cozyglow/components/Spinners/CozySpinner/CozySpinner';
import ErrorMessage from './common/ErrorMessage';
import { Trash2 } from 'react-feather';

const ViajesSection = ({
  viajesPublicados,
  reservasRecibidas,
  loading,
  error,
  onLoadData,
  onEliminarViaje
}) => {
  useEffect(() => {
    onLoadData();
  }, [onLoadData]);

  const handleEliminarViaje = async (viajeId) => {
    const confirmed = window.confirm(
      "¿Querés eliminar este viaje? Esta acción no se puede deshacer."
    );
    if (!confirmed) return;
    try {
      await onEliminarViaje(viajeId);
    } catch (err) {
      alert(err.message || "Error al eliminar viaje.");
    }
  };

  if (loading) return <CozySpinner size="md" text="Cargando viajes y reservas..." />;
  if (error) return <ErrorMessage error={error} onRetry={onLoadData} />;

  return (
    <section>
      <h1>Viajes y Reservas</h1>
      <div>
        {
          viajesPublicados.length === 0 
            ? (<div>¡Publicá un nuevo viaje!</div>)
            : (
              <div style={{borderRadius: 8, border: "1px solid #0001", overflow: "hidden"}}>
                {
                  viajesPublicados.map (
                    (viaje, i) => {
                      const fechaSalida = viaje.fecha || viaje.fechaSalida || "—";
                      const asientos = viaje.asientosTotales ?? viaje.asientos;
                      const asientosDisplay = asientos != null ? asientos : "-";
                      const estado = viaje.estado || "publicado";

                      const tieneReserva = reservasRecibidas.some( (r) => r.viajeId === viaje.id );
                      const tieneAceptado = reservasRecibidas.some( (r) => r.viajeId === viaje.id && r.estadoReserva === "aceptado" );

                      return (
                        <div key={viaje.id} style={{padding: 17, backgroundColor: "white", borderBottom: "1px solid #0001",}}>
                          <div>
                            <div style={{fontWeight: 600, fontSize: "1.09rem", marginBottom: 5}}> {viaje.origen} → {viaje.destino} </div>
                            <div> Salida: {fechaSalida} • Asientos: {asientosDisplay} • Estado: {estado} </div>
                          </div>
                          <div style={{marginTop: 10, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10}}>
                            {
                              tieneReserva
                              ? (<Badge variant="viajes" color="#1eb38134">Reservado</Badge>)
                              : (<Badge variant="rapido">Disponible</Badge>)
                            }
                            {
                              tieneAceptado
                              && (<Badge variant="viajes"> Aceptado </Badge>)
                            }
                            <button onClick={() => handleEliminarViaje(viaje.id)} style={{padding: 5, border: "none", backgroundColor: "transparent", borderRadius: 5, cursor: "pointer"}} title='Eliminar este viaje'>
                              <Trash2 color="var(--color-primary)"/>
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )
                }
              </div>
            )
        }
      </div>

      <div>
        <strong>Reservas recibidas</strong>
        {reservasRecibidas.length === 0 ? (
          <div>No tenés reservas aún.</div>
        ) : (
          <ReservasRecibidas
            viajes={viajesPublicados}
            reservas={reservasRecibidas}
            pasajeroLabelOverride="Viaje disponible"
          />
        )}
      </div>
    </section>
  );
};

export default ViajesSection;
