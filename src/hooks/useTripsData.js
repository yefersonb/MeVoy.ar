// src/hooks/useTripsData.js
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

export const useTripsData = (user) => {
  const [publishedTrips, setPublishedTrips] = useState([]);
  const [incomingReservations, setIncomingReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTripsAndReservations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const tripsRef = collection(db, 'viajes');

      // Try several possible field names for the driver ID
      const candidateFilters = [
        ['conductorId', user.uid],
        ['driverId', user.uid],
        ['conductor.uid', user.uid],
        ['ownerId', user.uid],
        ['owner.uid', user.uid],
      ];

      let trips = [];

      for (const [field, value] of candidateFilters) {
        try {
          let q;
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            q = query(tripsRef, where(`${parent}.${child}`, '==', value));
          } else {
            q = query(tripsRef, where(field, '==', value));
          }
          const snap = await getDocs(q);
          if (!snap.empty) {
            trips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            break;
          }
        } catch (e) {
          console.warn(`Filter failed for field ${field}:`, e.message);
        }
      }

      if (trips.length === 0) {
        const allSnap = await getDocs(tripsRef);
        trips = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      setPublishedTrips(trips);

      // Load reservations (root collection + subcollections) with deduplication
      const reservationsMap = new Map();
      if (trips.length > 0) {
        const tripIds = trips.map((v) => v.id).filter(Boolean);
        const chunkSize = 10;

        // Root-level reservations
        const reservationsRef = collection(db, 'reservas');
        for (let i = 0; i < tripIds.length; i += chunkSize) {
          const chunk = tripIds.slice(i, i + chunkSize);
          try {
            const q = query(reservationsRef, where('viajeId', 'in', chunk));
            const snap = await getDocs(q);
            snap.docs.forEach((d) => {
              const r = { id: d.id, ...d.data() };
              reservationsMap.set(r.id, r);
            });
          } catch (e) {
            console.warn('Error loading root reservations chunk:', e.message);
          }
        }

        // Subcollection reservations per trip
        for (const trip of trips) {
          try {
            const subRef = collection(db, 'viajes', trip.id, 'reservas');
            const snap = await getDocs(subRef);
            if (!snap.empty) {
              snap.docs.forEach((d) => {
                const r = { id: d.id, ...d.data(), viajeId: trip.id };
                reservationsMap.set(r.id, r);
              });
            }
          } catch (e) {
            console.warn(`Error loading subcollection for trip ${trip.id}:`, e.message);
          }
        }
      }

      setIncomingReservations(Array.from(reservationsMap.values()));
    } catch (err) {
      console.error('Error loading trips and reservations:', err);
      setError('Could not load trips and reservations.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteTrip = useCallback(
    async (tripId) => {
      try {
        await deleteDoc(doc(db, 'viajes', tripId));
        setPublishedTrips((prev) => prev.filter((v) => v.id !== tripId));
        return true;
      } catch (err) {
        console.error('Error deleting trip:', err);
        throw new Error('Could not delete the trip.');
      }
    },
    []
  );

  useEffect(() => {
    if (!user) return;
    loadTripsAndReservations();
  }, [user, loadTripsAndReservations]);

  return {
    publishedTrips,
    incomingReservations,
    loading,
    error,
    loadTripsAndReservations,
    deleteTrip,
  };
};
