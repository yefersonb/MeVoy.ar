// src/components/MisEnvios.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function MisEnvios() {
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, "envios"),
      where("creadorId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setEnvios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (!auth.currentUser) return <div className="p-4">Iniciá sesión.</div>;
  if (loading) return <div className="p-4">Cargando…</div>;
  if (!envios.length) return <div className="p-4 text-gray-600">Todavía no publicaste envíos.</div>;

  const chip = (t) => (
    <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50">{t}</span>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-3">
      {envios.map(e => (
        <div key={e.id} className="p-3 rounded border bg-white">
          <div className="flex items-start gap-3">
            {Array.isArray(e.fotos) && e.fotos[0] && (
              <img src={e.fotos[0]} alt="" className="w-20 h-20 object-cover rounded" />
            )}
            <div className="flex-1">
              <div className="font-semibold">{e.titulo || "Envío"}</div>
              <div className="text-sm text-gray-600">
                {e.origen} → {e.destino}
              </div>
              <div className="mt-1 flex items-center gap-2">
                {chip(`estado: ${e.estado || "-"}`)}
                {chip(`pago: ${e.pagoEstado || "-"}`)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
