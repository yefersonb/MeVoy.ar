// src/components/SeleccionarRol.js
import React from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function SeleccionarRol({ usuario, setRol }) {
  const elegirRol = async (rolElegido) => {
    try {
      await setDoc(
        doc(db, "usuarios", usuario.uid),
        { rol: rolElegido },
        { merge: true }
      );
      localStorage.setItem("rolSeleccionado", rolElegido);
      setRol(rolElegido);
    } catch (error) {
      console.error("Error al guardar el rol:", error);
      alert("Hubo un problema al guardar tu rol.");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "0.0rem 1rem" }}> {/* ðŸ”¥ CAMBIO AQUÃ: reduje padding de "1rem" a "0.5rem 1rem" */}
      <h2 style={{ fontSize: "1.20rem", fontWeight: "bold", marginBottom: "1rem" }}>
        ¿Cómo querés usar la app?
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        <span
          onClick={() => elegirRol("conductor")}
          style={{
            cursor: 'pointer',
            color: '#444',
            fontWeight: 500,
            fontSize: '1.05rem',
            position: 'relative',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => (e.target.style.color = 'var(--color-primary-700)')}
          onMouseLeave={(e) => (e.target.style.color = '#444')}
        >
          Conducir
          <span
            style={{
              display: 'block',
              height: '100px',
              backgroundColor: 'var(--color-primary-700)',
              position: 'absolute',
              bottom: -4,
              left: 0,
              right: 0,
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease',
            }}
          />
        </span>
        <span
          onClick={() => elegirRol("viajero")}
          style={{
            cursor: 'pointer',
            color: '#444',
            fontWeight: 500,
            fontSize: '1.05rem',
            position: 'relative',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => (e.target.style.color = 'var(--color-primary-700)')}
          onMouseLeave={(e) => (e.target.style.color = '#444')}
        >
          Viajar
          <span
            style={{
              display: 'block',
              height: '2px',
              backgroundColor: 'var(--color-primary-700)',
              position: 'absolute',
              bottom: -4,
              left: 0,
              right: 0,
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease',
            }}
          />
        </span>
      </div>
      {/* ðŸ”¥ Línea visible sí o sí */}
      <div style={{
        marginTop: '20px',
        marginBottom: '5px',
        width: '100%',
        height: '3px',
        backgroundColor: '#999',
        borderRadius: '4px'
      }} />
    </div>
  );
}

export default SeleccionarRol;
