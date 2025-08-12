import React, { useEffect } from 'react';
import Badge from './Badge';
import ReservasRecibidas from './ReservasRecibidas';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

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

  if (loading) return <LoadingSpinner size="md" text="Cargando viajes y reservas..." />;
  if (error) return <ErrorMessage error={error} onRetry={onLoadData} />;

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Reservas / Viajes</h1>

      <div className="mb-6">
        <div className="text-lg font-semibold mb-2">
          <strong>Tus viajes publicados</strong>
        </div>

        {viajesPublicados.length === 0 ? (
          <div className="text-gray-600">No tenés viajes publicados aún.</div>
        ) : (
          <div> {/* separación entre viajes aplicada manualmente abajo */}
            {viajesPublicados.map((viaje, i) => {
              const fechaSalida = viaje.fecha || viaje.fechaSalida || "—";
              const asientos = viaje.asientosTotales ?? viaje.asientos;
              const asientosDisplay = asientos != null ? asientos : "-";
              const estado = viaje.estado || "publicado";

              // Tiene alguna reserva relacionada
              const tieneReserva = reservasRecibidas.some(
                (r) => r.viajeId === viaje.id
              );
              // Tiene una reserva aceptada explícita
              const tieneAceptado = reservasRecibidas.some(
                (r) => r.viajeId === viaje.id && r.estadoReserva === "aceptado"
              );

              return (
                <div
                  key={viaje.id}
                  className={`p-3 border border-gray-200 rounded-lg flex justify-between items-center ${
                    // **Ajustá el espacio entre viajes cambiando "mb-12" por otro valor (ej. "mb-8" más chico o "mb-16" más grande)**
                    i < viajesPublicados.length - 1 ? "mb-12" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-semibold">
                      {viaje.origen} → {viaje.destino}
                    </div>
                    <div className="text-sm text-gray-600">
                      Salida: {fechaSalida} • Asientos: {asientosDisplay} • Estado: {estado}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {tieneReserva ? (
                      <Badge variant="viajes">Reservado</Badge>
                    ) : (
                      <Badge variant="rapido">Disponible</Badge>
                    )}
                    {tieneAceptado && (
                      <Badge
                        variant="viajes"
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        Aceptado
                      </Badge>
                    )}
                    <button
                      onClick={() => handleEliminarViaje(viaje.id)}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-6 mt-8">
        <div className="text-lg font-semibold mb-2">
          <strong>Reservas recibidas</strong>
        </div>
        {reservasRecibidas.length === 0 ? (
          <div className="text-gray-600">No tenés reservas aún.</div>
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
