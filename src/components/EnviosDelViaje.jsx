// src/components/EnviosDelViaje.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useInRouterContext } from "react-router-dom";
import {
  collection, doc, getDocs, getDoc, query, where,
  updateDoc, writeBatch, serverTimestamp
} from "firebase/firestore";
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

const EstadoBadge = ({ estado }) => {
  const color =
    estado === "PENDIENTE" ? "bg-yellow-100 text-yellow-800" :
    estado === "ACEPTADO" ? "bg-blue-100 text-blue-800" :
    estado === "EN_PROGRESO" ? "bg-indigo-100 text-indigo-800" :
    estado === "ENTREGADO" ? "bg-green-100 text-green-800" :
    estado === "CANCELADO" ? "bg-red-100 text-red-800" :
    "bg-gray-100 text-gray-800";
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>{estado}</span>;
};

export default function EnviosDelViaje({ conductorId, viajesPublicados = [], onRefrescar }) {
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const viajesIds = useMemo(() => viajesPublicados?.map(v => v.id) ?? [], [viajesPublicados]);

  useEffect(() => {
    const load = async () => {
      if (!conductorId || !viajesIds.length) { setEnvios([]); return; }
      setLoading(true);
      try {
        const chunk = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
        const chunks = chunk(viajesIds, 10);
        const results = [];
        for (const ids of chunks) {
          const qEnv = query(collection(db, "envios"), where("viajeId", "in", ids));
          const snap = await getDocs(qEnv);
          snap.forEach(d => results.push({ id: d.id, ...d.data() }));
        }
        results.sort((a,b) => (b?.timestamps?.creado || 0) - (a?.timestamps?.creado || 0));
        setEnvios(results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [conductorId, viajesIds]);

  // (silenciados si no se usan)
  const _getViaje = async (viajeId) => {
    const d = await getDoc(doc(db, "viajes", viajeId));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  };

  const aceptar = async (envio) => {
    setBusyId(envio.id);
    try {
      await updateDoc(doc(db, "envios", envio.id), {
        estado: "ACEPTADO",
        "timestamps.actualizado": serverTimestamp(),
      });
      onRefrescar?.();
    } catch (e) {
      alert("No se pudo aceptar el envío");
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const rechazar = async (envio) => {
    setBusyId(envio.id);
    try {
      await updateDoc(doc(db, "envios", envio.id), {
        estado: "CANCELADO",
        "timestamps.actualizado": serverTimestamp(),
      });
      onRefrescar?.();
    } catch (e) {
      alert("No se pudo rechazar");
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const iniciarRetiro = async (envio) => {
    setBusyId(envio.id);
    try {
      await updateDoc(doc(db, "envios", envio.id), {
        estado: "EN_PROGRESO",
        "timestamps.actualizado": serverTimestamp(),
        "evidencias.inicioAt": serverTimestamp(),
      });
      onRefrescar?.();
    } catch (e) {
      alert("No se pudo iniciar el retiro");
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const _bulkMarcarEntregado = async (ids = []) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.update(doc(db, "envios", id), {
        estado: "ENTREGADO",
        "timestamps.actualizado": serverTimestamp(),
      });
    });
    await batch.commit();
  };

  return (
    <div className="space-y-4">
      {loading && <div className="text-sm text-gray-500">Cargando envíos…</div>}
      {!loading && envios.length === 0 && (
        <div className="text-sm text-gray-500">No hay envíos vinculados a tus viajes todavía.</div>
      )}

      {envios.map((e) => (
        <article key={e.id} className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                📦 {e.descripcion || "Envío"} <EstadoBadge estado={e.estado} />
              </h3>
              <div className="mt-1 text-sm text-gray-600">
                <div>Peso: <strong>{e.pesoKg ?? "?"} kg</strong> • Volumen: <strong>{e.volumenL ?? "?"} L</strong> {e.fragil ? "• Frágil" : ""}</div>
                <div>Desde: <strong>{e?.origen?.direccion || "—"}</strong></div>
                <div>Hasta: <strong>{e?.destino?.direccion || "—"}</strong></div>
                <div>Monto: <strong>${e?.montoARS?.toLocaleString("es-AR") || "—"}</strong></div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {e.viajeId && <span>Viaje: {e.viajeId.slice(0,6)}…</span>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {e.estado === "PENDIENTE" && (
              <>
                <button
                  onClick={() => aceptar(e)}
                  disabled={busyId === e.id}
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => rechazar(e)}
                  disabled={busyId === e.id}
                  className="px-3 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </>
            )}

            {e.estado === "ACEPTADO" && (
              <button
                onClick={() => iniciarRetiro(e)}
                disabled={busyId === e.id}
                className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Iniciar retiro
              </button>
            )}

            {e.estado === "EN_PROGRESO" && (
              <SafeLink to={`/envios/${e.id}/entrega`}>
                <button className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">
                  Entregar / Ingresar PIN
                </button>
              </SafeLink>
            )}

            {e.estado === "ENTREGADO" && (
              <SafeLink to={`/envios/${e.id}`}>
                <button className="px-3 py-2 rounded bg-emerald-100 text-emerald-800">
                  Ver detalle
                </button>
              </SafeLink>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
