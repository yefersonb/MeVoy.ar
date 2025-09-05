// src/components/EnviosDisponibles.jsx
import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Link as RouterLink, useInRouterContext } from "react-router-dom";
import { db } from "../firebase";

const SafeLink = React.forwardRef(({ to, children, ...rest }, ref) => {
  // ✅ Hook llamado SIEMPRE en el tope del componente
  const inRouter = useInRouterContext();
  return inRouter ? (
    <RouterLink ref={ref} to={to} {...rest}>{children}</RouterLink>
  ) : (
    <a ref={ref} href={to} {...rest}>{children}</a>
  );
});
SafeLink.displayName = "SafeLink";

export default function EnviosDisponibles() {
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [qOrigen, setQOrigen] = useState("");
  const [qDestino, setQDestino] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [soloConFotos, setSoloConFotos] = useState(false);

  useEffect(() => {
    const qRef = query(collection(db, "envios"), where("estado", "==", "publicado"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime();
          const tb = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime();
          return tb - ta;
        });
        setEnvios(docs);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot(envios) error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const lista = useMemo(() => {
    return envios
      .filter((e) => (soloConFotos ? Array.isArray(e.fotos) && e.fotos.length > 0 : true))
      .filter((e) => qOrigen.trim() ? (e.origen || "").toLowerCase().includes(qOrigen.trim().toLowerCase()) : true)
      .filter((e) => qDestino.trim() ? (e.destino || "").toLowerCase().includes(qDestino.trim().toLowerCase()) : true)
      .filter((e) => precioMax ? Number(e.precio ?? e.precioSugerido ?? 0) <= Number(precioMax) : true);
  }, [envios, qOrigen, qDestino, precioMax, soloConFotos]);

  const thumbStyle = { width: 72, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0, overflow: "hidden" };

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="p-3 rounded border bg-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Origen contiene…" value={qOrigen} onChange={(e) => setQOrigen(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Destino contiene…" value={qDestino} onChange={(e) => setQDestino(e.target.value)} />
          <input type="number" min="0" className="border rounded px-3 py-2" placeholder="Precio máx (ARS)" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={soloConFotos} onChange={(e) => setSoloConFotos(e.target.checked)} />
            Solo con fotos
          </label>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-4">Cargando envíos…</div>
      ) : lista.length === 0 ? (
        <div className="p-4 text-gray-600">No hay envíos que coincidan con los filtros.</div>
      ) : (
        <div className="space-y-3">
          {lista.map((e) => (
            <div key={e.id} className="p-3 rounded border bg-white">
              <div className="flex items-start gap-3">
                {Array.isArray(e.fotos) && e.fotos[0] ? (
                  <img src={e.fotos[0]} alt="Foto del paquete" style={thumbStyle} loading="lazy" />
                ) : (
                  <div style={{ ...thumbStyle, background: "#f3f4f6" }} className="flex items-center justify-center">
                    <span style={{ fontSize: 20 }}>📦</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{e.titulo || "Envío"}</div>
                  <div className="text-sm text-gray-600 truncate">{(e.origen || "—")} → {(e.destino || "—")}</div>
                  <div className="mt-1 text-sm">Precio: <b>${Number(e.precio ?? e.precioSugerido ?? 0).toLocaleString("es-AR")}</b></div>
                </div>

                <SafeLink className="px-3 py-2 rounded bg-indigo-600 text-white text-sm shrink-0" to={`/conductor/envio/${e.id}`}>
                  Ver / Aceptar
                </SafeLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
