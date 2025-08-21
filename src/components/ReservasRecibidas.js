import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import DetalleViajante from "./DetalleViajante";

// Abreviar ubicación
const abreviarUbicacion = (ubic) => {
  if (!ubic) return ubic;
  return ubic
    .replace(/Misiones(?: Province)?/g, "Mnes")
    .replace(/Argentina/g, "AR");
};

// Normaliza reservas
const normalizarReservas = (viajes = [], reservasRaw) => {
  if (Array.isArray(reservasRaw)) {
    return reservasRaw.map((r, idx) => {
      const viaje = viajes.find((v) => v.id === r.viajeId);
      return {
        ...r,
        key: `${r.viajeId || "unknown"}-${r.id || idx}`,
        viaje,
      };
    });
  } else if (reservasRaw && typeof reservasRaw === "object") {
    return Object.entries(reservasRaw).flatMap(([idViaje, arr]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((r, idx) => ({
        ...r,
        key: `${idViaje}-${idx}`,
        viaje: viajes.find((v) => v.id === idViaje),
        viajeId: idViaje,
      }));
    });
  }
  return [];
};

// Extrae UID fiable del viajante
const extraerUidViajante = (res) => {
  return (
    res.uidPasajero ||
    res.pasajeroUid ||
    res.viajanteUid ||
    (res.pasajero && (res.pasajero.uid || res.pasajero.userId)) ||
    null
  );
};

// Silueta SVG simple para avatar neutro
const Silueta = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <circle cx="22" cy="22" r="22" fill="#e2e8f0" />
    <ellipse cx="22" cy="18" rx="8" ry="8" fill="#cbd5e1" />
    <ellipse cx="22" cy="34" rx="13" ry="7" fill="#cbd5e1" />
  </svg>
);

function ReservaItem({
  res,
  pasajeroLabelOverride,
  onVerPerfil,
  onEliminar,
  perfilPasajero,
  loadingPerfil,
}) {
  // nombre con prioridad
  const displayName =
    perfilPasajero?.nombre ||
    pasajeroLabelOverride ||
    (res.pasajero && res.pasajero.nombre) ||
    res.pasajeroNombre ||
    "Sin nombre";

  // Mostrar UID o info de quien reservó si está disponible
  const quienReservo =
    perfilPasajero?.nombre ||
    res.pasajeroNombre ||
    (res.pasajero && res.pasajero.nombre) ||
    perfilPasajero?.whatsapp ||
    res.pasajeroWhatsapp ||
    (res.pasajero && res.pasajero.whatsapp) ||
    perfilPasajero?.uid ||
    res.uidPasajero ||
    res.pasajeroUid ||
    res.viajanteUid ||
    (res.pasajero && (res.pasajero.uid || res.pasajero.userId)) ||
    "Sin datos";

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-5 mb-12 shadow-sm"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Foto */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loadingPerfil ? (
            <span style={{ fontSize: 18, color: "#888" }}>...</span>
          ) : perfilPasajero?.fotoPerfil ? (
            <img
              src={perfilPasajero.fotoPerfil}
              alt="Foto viajante"
              style={{
                width: 44,
                height: 44,
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          ) : (
            <Silueta />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          {/* Nombre como botón (accesible) */}
          <div>
            {perfilPasajero ? (
              <button
                onClick={onVerPerfil}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  color: "var(--color-primary-700)",
                  textDecoration: "underline",
                  fontWeight: 500,
                  fontSize: "1.05rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                aria-label={`Ver perfil de ${displayName}`}
              >
                {displayName}
              </button>
            ) : (
              <span style={{ color: "#888" }}>{displayName}</span>
            )}
          </div>
          {/* Info de viaje */}
          <div style={{ fontSize: "0.97rem", color: "#444", marginTop: 2 }}>
            <span style={{ fontWeight: 500 }}>
              {abreviarUbicacion(res.viaje?.origen)} â†’ {abreviarUbicacion(res.viaje?.destino)}
            </span>
          </div>
          <div style={{ fontSize: "0.89rem", color: "#888" }}>
            {res.viaje?.horario
              ? new Date(res.viaje.horario).toLocaleString()
              : res.fechaReserva
              ? new Date(
                  res.fechaReserva.seconds
                    ? res.fechaReserva.toDate()
                    : res.fechaReserva
                ).toLocaleString()
              : ""}
          </div>
          {/* Mostrar quién reservó */}
          <div style={{ fontSize: "0.89rem", color: "var(--color-primary-700)", marginTop: 2 }}>
            <span style={{ fontWeight: 400 }}>
              Reservado por: {quienReservo}
            </span>
          </div>
        </div>
        {/* Eliminar link */}
        {onEliminar && (
          <div style={{ marginLeft: 8 }}>
            <button
              onClick={onEliminar}
              className="underline"
              style={{
                color: "#c0392b",
                background: "none",
                border: "none",
                fontSize: "0.97rem",
                cursor: "pointer",
                fontWeight: 400,
                padding: 0,
                textDecoration: "underline",
                fontFamily: "inherit",
                transition: "color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#a93226")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#c0392b")}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReservasRecibidas({
  viajes,
  reservas,
  pasajeroLabelOverride = null,
}) {
  const [mostrarViajanteUid, setMostrarViajanteUid] = useState(null);
  const [viajeSeleccionadoId, setViajeSeleccionadoId] = useState(null);
  const [perfilPasajeros, setPerfilPasajeros] = useState({});
  const [loadingPerfiles, setLoadingPerfiles] = useState({});
  const todasLasReservas = useMemo(
    () => normalizarReservas(viajes || [], reservas || []),
    [viajes, reservas]
  );
  const [refreshToggle, setRefreshToggle] = useState(false);

  // Debug de datos entrantes
  useEffect(() => {
    console.log("DEBUG ReservasRecibidas - viajes:", viajes);
    console.log("DEBUG ReservasRecibidas - reservas:", reservas);
  }, [viajes, reservas]);

  // Cargar perfiles de todos los viajantes de las reservas
  useEffect(() => {
    let mounted = true;
    const fetchPerfiles = async () => {
      const nuevos = {};
      const loading = {};
      await Promise.all(
        todasLasReservas.map(async (res) => {
          const uid = extraerUidViajante(res);
          if (!uid) return;
          loading[res.key] = true;
          try {
            const snap = await getDoc(doc(db, "usuarios", uid));
            if (snap.exists()) {
              nuevos[res.key] = snap.data();
            }
          } catch (e) {
            // ignore
          } finally {
            loading[res.key] = false;
          }
        })
      );
      if (mounted) {
        setPerfilPasajeros(nuevos);
        setLoadingPerfiles(loading);
      }
    };
    fetchPerfiles();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line
  }, [todasLasReservas, refreshToggle]);

  // Eliminar reserva
  const handleEliminarReserva = async (res) => {
    if (!window.confirm("¿Eliminar esta reserva?")) return;
    try {
      if (res.viajeId && res.id) {
        await deleteDoc(doc(db, "viajes", res.viajeId, "reservas", res.id));
        setRefreshToggle((f) => !f);
      } else {
        alert("No se pudo eliminar la reserva (faltan datos).");
      }
    } catch (e) {
      alert("Error al eliminar la reserva.");
      console.error(e);
    }
  };

  const handleVerPerfil = (uid, key, viajeId) => {
    setMostrarViajanteUid(uid);
    setViajeSeleccionadoId(viajeId);
  };

  const onDecisionSobreReserva = (estado, reserva) => {
    setRefreshToggle((f) => !f);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      {(!viajes || (Array.isArray(viajes) && viajes.length === 0)) &&
        (!reservas || (Array.isArray(reservas) && reservas.length === 0)) && (
          <div className="p-4 bg-yellow-50 rounded-md mb-4">
            <p className="text-sm text-yellow-800">
              No se cargaron viajes ni reservas todavía. Asegurate de que el hook que
              provee esos datos (useViajesData) haya corrido y que le pasás los props correctos.
            </p>
          </div>
      )}

      {todasLasReservas.length === 0 ? (
        <p className="text-gray-600">No hay reservas por el momento.</p>
      ) : (
        todasLasReservas.map((res) => {
          const viajanteUid = extraerUidViajante(res);
          return (
            <ReservaItem
              key={res.key}
              res={res}
              pasajeroLabelOverride={pasajeroLabelOverride}
              perfilPasajero={perfilPasajeros[res.key]}
              loadingPerfil={loadingPerfiles[res.key]}
              onVerPerfil={
                viajanteUid
                  ? () =>
                      handleVerPerfil(
                        viajanteUid,
                        res.key,
                        res.viajeId || res.viaje?.id
                      )
                  : undefined
              }
              onEliminar={() => handleEliminarReserva(res)}
            />
          );
        })
      )}
      {mostrarViajanteUid && (
        <DetalleViajante
          viajanteUid={mostrarViajanteUid}
          viajeId={viajeSeleccionadoId}
          esConductorQueDecide={true}
          onClose={() => {
            setMostrarViajanteUid(null);
            setViajeSeleccionadoId(null);
          }}
          onDecision={(estado) => {
            const reserva = todasLasReservas.find(
              (r) => (r.viajeId || r.viaje?.id) === viajeSeleccionadoId
            );
            onDecisionSobreReserva(estado, reserva);
          }}
        />
      )}
    </div>
  );
}

