// src/hooks/usePerfilData.js
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const defaultValoraciones = {
  conduccion: 0,
  puntualidad: 0,
  amabilidad: 0,
  limpieza: 0,
};

export const usePerfilData = (usuario) => {
  const [perfil, setPerfil] = useState({
    nombre: "",
    whatsapp: "",
    fechaNacimiento: "",
    modeloVehiculo: "",
    descripcion: "",
    nivelExperiencia: "Novato",
    fotoURL: "",
    tasaRespuesta: 0.9,
    viajesCompletados: 10,
    viajesPublicados: 10,
    ultimoViaje: "2025-07-28",
    valoraciones: defaultValoraciones,
  });
  
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!usuario) {
      setLoading(true);
      return;
    }

    const loadPerfil = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const ref = doc(db, "usuarios", usuario.uid);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          const perfilData = {
            ...data,
            nombre: data.nombre || usuario?.displayName || "",
            fotoURL: data.fotoURL || usuario?.photoURL || "",
            valoraciones: { ...defaultValoraciones, ...(data.valoraciones || {}) },
          };
          setPerfil(perfilData);
          setOriginal(perfilData);
        } else {
          const fallbackData = {
            nombre: usuario?.displayName || "",
            fotoURL: usuario?.photoURL || "",
            valoraciones: defaultValoraciones,
          };
          setPerfil(prev => ({ ...prev, ...fallbackData }));
          setOriginal(fallbackData);
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
        setError(
          err.code === "permission-denied" 
            ? "No tenés permiso para ver tu perfil. Revisá autenticación."
            : "Error al cargar perfil."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPerfil();
  }, [usuario]);

  const updatePerfil = (field, value) => {
    setPerfil(prev => ({ ...prev, [field]: value }));
  };

  const savePerfil = async () => {
    if (!usuario) return false;
    
    try {
      setGuardado(true);
      
      await setDoc(doc(db, "usuarios", usuario.uid), perfil, { merge: true });
      setOriginal(perfil);
      
      setTimeout(() => setGuardado(false), 2500);
      return true;
    } catch (err) {
      console.error("Error guardando perfil:", err);
      setGuardado(false);
      throw new Error("No se pudo guardar el perfil: " + err.message);
    }
  };

  const cancelEdit = () => {
    setPerfil(original);
  };

  return {
    perfil,
    loading,
    error,
    guardado,
    updatePerfil,
    savePerfil,
    cancelEdit,
  };
};
