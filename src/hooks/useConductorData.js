//src/hooks/useConductorData.js
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function useConductorData(usuario, isConductor) {
  const [viajes, setViajes] = useState([]);
  const [reservas, setReservas] = useState({});

  useEffect(() => {
    if (!usuario || !isConductor) return;

    const q = query(collection(db, "viajes"), orderBy("horario", "asc"));
    const unsub = onSnapshot(q, async (snap) => {
      const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const misViajes = todos.filter((v) => v.conductor?.uid === usuario.uid);
      setViajes(misViajes);

      const pairs = await Promise.all(
        misViajes.map(async (v) => {
          const rs = await getDocs(collection(db, "viajes", v.id, "reservas"));
          return [v.id, rs.docs.map((r) => r.data())];
        })
      );
      setReservas(Object.fromEntries(pairs));
    });

    return () => unsub();
  }, [usuario, isConductor]);

  return { viajes, reservas };
}
