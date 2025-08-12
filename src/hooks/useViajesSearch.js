// src/hooks/useViajesSearch.js
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

const normalize = (s="") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function useViajesSearch({ auto = true } = {}) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ origen: "", destino: "", fecha: "" });

  useEffect(() => {
    if (!auto) return;
    const q = query(collection(db, "viajes"), orderBy("horario", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();
      const arr = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v) => v.horario?.toDate ? v.horario.toDate() >= now : true);
      setAll(arr);
      setLoading(false);
    });
    return () => unsub();
  }, [auto]);

  const resultados = useMemo(() => {
    const o = normalize(filters.origen);
    const d = normalize(filters.destino);
    const f = filters.fecha ? new Date(filters.fecha) : null;

    return all.filter((v) => {
      const oMatch = o ? normalize(v.origen || "").includes(o) : true;
      const dMatch = d ? normalize(v.destino || "").includes(d) : true;
      const date = v.horario?.toDate ? v.horario.toDate() : new Date(v.horario);
      const sameDay = f ? date?.toDateString() === f.toDateString() : true;
      return oMatch && dMatch && sameDay;
    });
  }, [all, filters]);

  return {
    resultados,
    loading,
    filters,
    setFilters,
    clear: () => setFilters({ origen: "", destino: "", fecha: "" }),
  };
}
