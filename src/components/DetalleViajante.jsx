// src/components/DetalleViajante.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// Silueta SVG simple para avatar neutro (mismo que ReservasRecibidas)
const Silueta = ({ size = 70 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <circle cx="22" cy="22" r="22" fill="#e2e8f0" />
    <ellipse cx="22" cy="18" rx="8" ry="8" fill="#cbd5e1" />
    <ellipse cx="22" cy="34" rx="13" ry="7" fill="#cbd5e1" />
  </svg>
);

const renderEstrellas = (reputacion, totalOpiniones) => {
  const estrellasLlenas = Math.floor(reputacion);
  const tieneMedia = reputacion % 1 >= 0.5;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span>
        {"â­".repeat(estrellasLlenas)}
        {tieneMedia ? "âœ¬" : ""}
      </span>
      <span style={{ color: "#888", marginLeft: 4, fontSize: 12 }}>
        {reputacion.toFixed(1)} Â· {totalOpiniones} {totalOpiniones === 1 ? "opinión" : "opiniones"}
      </span>
    </span>
  );
};

export default function DetalleViajante({
  viajanteUid,
  viajeId,
  esConductorQueDecide = false, // si quien lo ve puede aceptar/rechazar
  onClose,
  onDecision, // callback (estado) => {}
}) {
  const [perfil, setPerfil] = useState(null);
  const [reputacion, setReputacion] = useState(null);
  const [totalOpiniones, setTotalOpiniones] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState(false);
  const [imagenError, setImagenError] = useState(false);

  useEffect(() => {
    if (!viajanteUid) return;
    (async () => {
      try {
        const ref = doc(db, "usuarios", viajanteUid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          console.log("Datos del perfil:", data); // Debug para ver los datos
          console.log("URL de foto:", data.fotoPerfil); // Debug específico para la foto
          setPerfil(data);
        }

        const califRef = collection(db, "usuarios", viajanteUid, "calificaciones");
        const califSnap = await getDocs(califRef);
        if (!califSnap.empty) {
          const notas = califSnap.docs
            .map((d) => d.data()?.puntuacion)
            .filter((n) => typeof n === "number");
          if (notas.length) {
            const promedio = notas.reduce((a, b) => a + b, 0) / notas.length;
            setReputacion(promedio);
            setTotalOpiniones(notas.length);
          }
        }
      } catch (e) {
        console.error("Error cargando viajante:", e);
      } finally {
        setCargando(false);
      }
    })();
  }, [viajanteUid]);

  const manejarDecision = async (estado) => {
    if (!esConductorQueDecide) return;
    setAccionando(true);
    try {
      // Actualizás el viaje con la decisión: ejemplo simplificado
      await setDoc(
        doc(db, "viajes", viajeId),
        { estadoReserva: estado },
        { merge: true }
      );
      if (onDecision) onDecision(estado);
    } catch (e) {
      console.error("Error guardando decisión:", e);
      alert("No se pudo registrar la decisión.");
    } finally {
      setAccionando(false);
    }
  };

  const handleImagenError = () => {
    console.log("Error cargando imagen:", perfil?.fotoPerfil);
    setImagenError(true);
  };

  if (cargando) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          Cargando perfil del viajante...
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          No se encontró el perfil.
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          Ã—
        </button>

        {/* Título */}
        <h2 style={{
          margin: '0 0 24px 0',
          fontSize: '24px',
          fontWeight: '600',
          color: '#333'
        }}>
          Perfil del viajante
        </h2>

        {/* Contenido principal */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: 'flex-start' }}>
          {/* Sistema de imagen mejorado igual que ReservasRecibidas */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: '3px solid #f1f5f9'
            }}
          >
            {perfil.fotoPerfil && !imagenError ? (
              <img
                src={perfil.fotoPerfil}
                alt="Foto viajante"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                onError={handleImagenError}
                onLoad={() => console.log("Imagen cargada exitosamente")}
              />
            ) : (
              <Silueta size={80} />
            )}
          </div>
          
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                <strong style={{ color: '#374151' }}>Nombre:</strong> 
                <span style={{ marginLeft: '8px', color: '#111827' }}>
                  {perfil.nombre || "â€”"}
                </span>
              </p>
              
              {perfil.whatsapp && (
                <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                  <strong style={{ color: '#374151' }}>WhatsApp:</strong> 
                  <span style={{ marginLeft: '8px', color: '#111827' }}>
                    {perfil.whatsapp}
                  </span>
                </p>
              )}
              
              {perfil.direccion && (
                <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                  <strong style={{ color: '#374151' }}>Dirección:</strong> 
                  <span style={{ marginLeft: '8px', color: '#111827' }}>
                    {perfil.direccion}
                  </span>
                </p>
              )}
              
              {perfil.email && (
                <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                  <strong style={{ color: '#374151' }}>Email:</strong> 
                  <span style={{ marginLeft: '8px', color: '#111827' }}>
                    {perfil.email}
                  </span>
                </p>
              )}
              
              {reputacion !== null && (
                <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                  <strong style={{ color: '#374151' }}>Reputación:</strong> 
                  <span style={{ marginLeft: '8px' }}>
                    {renderEstrellas(reputacion, totalOpiniones)}
                  </span>
                </p>
              )}
            </div>

            {/* Debug info - puedes remover esto después */}
            {perfil.fotoPerfil && (
              <div style={{ 
                padding: '8px', 
                backgroundColor: 'var(--color-bg)', 
                borderRadius: '4px', 
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--color-text-muted)'
              }}>
                <strong>Debug URL:</strong> {perfil.fotoPerfil.substring(0, 60)}...
                <br />
                <strong>Error de imagen:</strong> {imagenError ? 'Sí' : 'No'}
              </div>
            )}
          </div>
        </div>

        {/* Botones de decisión */}
        {esConductorQueDecide && (
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => manejarDecision("rechazado")}
              disabled={accionando}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                border: "2px solid #ef4444",
                background: "var(--color-surface)",
                color: "#ef4444",
                cursor: accionando ? 'not-allowed' : "pointer",
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                opacity: accionando ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!accionando) {
                  e.target.style.backgroundColor = '#ef4444';
                  e.target.style.color = 'var(--color-surface)';
                }
              }}
              onMouseOut={(e) => {
                if (!accionando) {
                  e.target.style.backgroundColor = 'var(--color-surface)';
                  e.target.style.color = '#ef4444';
                }
              }}
            >
              {accionando ? 'Procesando...' : 'Rechazar viaje'}
            </button>
            <button
              onClick={() => manejarDecision("aceptado")}
              disabled={accionando}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                border: "none",
                background: "#10b981",
                color: "var(--color-surface)",
                cursor: accionando ? 'not-allowed' : "pointer",
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                opacity: accionando ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!accionando) {
                  e.target.style.backgroundColor = '#059669';
                }
              }}
              onMouseOut={(e) => {
                if (!accionando) {
                  e.target.style.backgroundColor = '#10b981';
                }
              }}
            >
              {accionando ? 'Procesando...' : 'Aceptar viaje'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
