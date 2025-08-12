// hooks/useViajesData.js
import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useViajesData = (usuario) => {
  const [viajesPublicados, setViajesPublicados] = useState([]);
  const [reservasRecibidas, setReservasRecibidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadViajesYReservas = useCallback(async () => {
    if (!usuario) return;

    setLoading(true);
    setError(null);

    try {
      const viajesRef = collection(db, 'viajes');

      // Heurística: probar varios campos posibles
      const posiblesFiltros = [
        ['conductorId', usuario.uid],
        ['driverId', usuario.uid],
        ['conductor.uid', usuario.uid],
        ['ownerId', usuario.uid],
        ['owner.uid', usuario.uid],
      ];

      let publicados = [];

      for (const [campo, valor] of posiblesFiltros) {
        try {
          let q;
          if (campo.includes('.')) {
            const [parent, child] = campo.split('.');
            q = query(viajesRef, where(`${parent}.${child}`, '==', valor));
          } else {
            q = query(viajesRef, where(campo, '==', valor));
          }
          const snap = await getDocs(q);
          if (!snap.empty) {
            publicados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            break;
          }
        } catch (e) {
          console.warn(`Filtro fallido ${campo}:`, e.message);
        }
      }

      if (publicados.length === 0) {
        // fallback: traer todos y luego filtrar si hace falta (o mostrar todo)
        const allSnap = await getDocs(viajesRef);
        publicados = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      setViajesPublicados(publicados);

      // Cargar reservas (raíces y subcolecciones) con dedupe
      const reservasMap = new Map();
      if (publicados.length > 0) {
        const viajesIds = publicados.map((v) => v.id).filter(Boolean);
        const chunkSize = 10;

        // reservas raíz
        const reservasRef = collection(db, 'reservas');
        for (let i = 0; i < viajesIds.length; i += chunkSize) {
          const chunk = viajesIds.slice(i, i + chunkSize);
          try {
            const qReservas = query(reservasRef, where('viajeId', 'in', chunk));
            const snapRes = await getDocs(qReservas);
            snapRes.docs.forEach((d) => {
              const r = { id: d.id, ...d.data() };
              reservasMap.set(r.id, r);
            });
          } catch (chunkErr) {
            console.warn('Error cargando chunk de reservas raíz:', chunkErr.message);
          }
        }

        // subcolecciones
        for (const viaje of publicados) {
          try {
            const subResRef = collection(db, 'viajes', viaje.id, 'reservas');
            const snapSub = await getDocs(subResRef);
            if (!snapSub.empty) {
              snapSub.docs.forEach((d) => {
                const r = { id: d.id, ...d.data(), viajeId: viaje.id };
                reservasMap.set(r.id, r);
              });
            }
          } catch (subErr) {
            console.warn(`Error en subcolección de viaje ${viaje.id}:`, subErr.message);
          }
        }
      }

      setReservasRecibidas(Array.from(reservasMap.values()));
    } catch (err) {
      console.error('Error cargando viajes y reservas:', err);
      setError('No se pudieron cargar viajes y reservas.');
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  const eliminarViaje = useCallback(
    async (viajeId) => {
      try {
        await deleteDoc(doc(db, 'viajes', viajeId));
        setViajesPublicados((prev) => prev.filter((v) => v.id !== viajeId));
        return true;
      } catch (err) {
        console.error('Error eliminando viaje:', err);
        throw new Error('No se pudo eliminar el viaje.');
      }
    },
    []
  );

  useEffect(() => {
    if (!usuario) return;
    loadViajesYReservas();
  }, [usuario, loadViajesYReservas]);

  return {
    viajesPublicados,
    reservasRecibidas,
    loading,
    error,
    loadViajesYReservas,
    eliminarViaje,
  };
};
