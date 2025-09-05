import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc,
  where, limit, startAfter, serverTimestamp,arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../../firebase";

const TABS = [
  { key: "pending", label: "Pendientes" },
  { key: "verified", label: "Verificados" },
  { key: "rejected", label: "Rechazados" },
  { key: "all", label: "Todos" },
];

export default function AdminVerificador() {
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [endCursor, setEndCursor] = useState(null);

  const unsubRef = useRef(null);
  const s = useMemo(() => (search || "").trim().toLowerCase(), [search]);

  useEffect(() => {
    // limpiar subs y estado al cambiar de tab
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    setLoading(true);
    setErr("");
    setItems([]);
    setHasMore(false);
    setEndCursor(null);

    // arma la query base
    const baseCol = collection(db, "verificaciones");
    let q;
    if (tab === "all") {
      q = query(baseCol, orderBy("updatedAt", "desc"), limit(30));
    } else {
      q = query(baseCol, where("status", "==", tab), orderBy("updatedAt", "desc"), limit(30));
    }

    // suscripción en vivo con fallback por índice
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setItems(arr);
        setEndCursor(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.size === 30);
        setLoading(false);
      },
      async (error) => {
        // si falta índice, hacemos lectura sin orderBy y ordenamos local
        if (error?.code === "failed-precondition") {
          try {
            let q2 = tab === "all"
              ? query(baseCol, limit(200))
              : query(baseCol, where("status", "==", tab), limit(200));
            const snap = await getDocs(q2);
            const arr = [];
            snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
            arr.sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
            setItems(arr);
            setErr("Falta índice compuesto para esta pestaña (usando orden local temporalmente).");
          } catch (e) {
            console.error("[AdminVerificador] fallback getDocs error:", e);
            setErr(e?.message || "Error leyendo verificaciones.");
          } finally {
            setLoading(false);
          }
        } else {
          console.error("[AdminVerificador] onSnapshot error:", error);
          setErr(error?.message || "Error leyendo verificaciones.");
          setLoading(false);
        }
      }
    );

    unsubRef.current = unsub;
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [tab]);

  // paginar “cargar más” (solo cuando hay índice)
  const loadMore = async () => {
    if (!hasMore || !endCursor) return;
    let q;
    const baseCol = collection(db, "verificaciones");
    if (tab === "all") {
      q = query(baseCol, orderBy("updatedAt", "desc"), startAfter(endCursor), limit(30));
    } else {
      q = query(baseCol, where("status", "==", tab), orderBy("updatedAt", "desc"), startAfter(endCursor), limit(30));
    }
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    setItems((prev) => [...prev, ...arr]);
    setEndCursor(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.size === 30);
  };

  // filtro client-side por nombre/DNI/UID
  const filtered = useMemo(() => {
    if (!s) return items;
    return items.filter((it) =>
      (it.nombreCompleto || "").toLowerCase().includes(s) ||
      (it.dniNumero || "").toString().toLowerCase().includes(s) ||
      (it.id || "").toLowerCase().includes(s)
    );
  }, [items, s]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <HeaderBar tab={tab} setTab={setTab} search={search} setSearch={setSearch} />

      {!!err && (
        <div style={{ padding: 12, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#7C2D12", borderRadius: 8 }}>
          {err}
        </div>
      )}

      {loading ? (
        <div style={{ opacity: .7 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <>
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((it) => <VerifCard key={it.id} item={it} />)}
          </div>
          {hasMore && (
            <button onClick={loadMore} style={btnGhost}>Cargar más</button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- UI auxiliares ---------- */

function HeaderBar({ tab, setTab, search, setSearch }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: tab === t.key ? "#111827" : "#fff",
              color: tab === t.key ? "#fff" : "#111827",
              fontWeight: 600
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ marginLeft: "auto" }}>
        <input
          placeholder="Buscar por nombre, DNI o UID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            minWidth: 260
          }}
        />
      </div>
    </div>
  );
}

function EmptyState({ tab }) {
  const msg = {
    pending: "No hay verificaciones pendientes.",
    verified: "No hay verificaciones verificadas.",
    rejected: "No hay verificaciones rechazadas.",
    all: "No hay verificaciones.",
  }[tab] || "Sin datos.";
  return (
    <div style={{ padding: 24, border: "1px dashed #e5e7eb", borderRadius: 12, textAlign: "center", color: "#6b7280" }}>
      {msg}
    </div>
  );
}

function VerifCard({ item }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const setStatus = async (to) => {
    if (busy) return;
    setBusy(true);
    try {
      const ref = doc(db, "verificaciones", item.id);
      const snap = await getDoc(ref);
      const prev = snap.exists() ? snap.data() : {};
      const from = prev.status || "incomplete";
      const user = auth.currentUser;

     const historyEntry = {
       by: user?.uid || null,
       byName: user?.displayName || user?.email || "admin",
       // ✅ usar Date del cliente (Firestore lo guarda como Timestamp)
       at: new Date(),
       from,
       to,
       note: note || null,
     };
      await updateDoc(ref, {
        status: to,
        adminNotes: note || null,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || null,
        updatedAt: serverTimestamp(),
       // ✅ apendear de forma segura
       history: arrayUnion(historyEntry),
      });
    } catch (e) {
      console.error("[AdminVerificador] updateDoc error:", e);
      alert("No se pudo actualizar el estado. Revisá permisos/reglas.");
    } finally {
      setBusy(false);
      setNote("");
    }
  };

  const Label = ({ children }) => <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{children}</div>;
  const Box = ({ children }) => (
    <div style={{ height: 100, border: "1px solid #eee", borderRadius: 8, display: "grid", placeItems: "center", overflow: "hidden", background: "#fafafa" }}>
      {children}
    </div>
  );

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>{item.nombreCompleto || "(sin nombre)"}</div>
        <div style={{ color: "#6b7280" }}>DNI: {item.dniNumero || "—"}</div>
        <StatusPill status={item.status} />
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>{item.id}</div>
      </div>

      {/* Documentos */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div>
          <Label>DNI Frente</Label>
          <Box>{item.dniFrenteURL ? <a href={item.dniFrenteURL} target="_blank" rel="noreferrer"><img alt="" src={item.dniFrenteURL} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} /></a> : "—"}</Box>
        </div>
        <div>
          <Label>DNI Dorso</Label>
          <Box>{item.dniDorsoURL ? <a href={item.dniDorsoURL} target="_blank" rel="noreferrer"><img alt="" src={item.dniDorsoURL} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} /></a> : "—"}</Box>
        </div>
        <div>
          <Label>Licencia Frente</Label>
          <Box>{item.licenciaFrenteURL ? <a href={item.licenciaFrenteURL} target="_blank" rel="noreferrer"><img alt="" src={item.licenciaFrenteURL} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} /></a> : "—"}</Box>
        </div>
        <div>
          <Label>Licencia Dorso</Label>
          <Box>{item.licenciaDorsoURL ? <a href={item.licenciaDorsoURL} target="_blank" rel="noreferrer"><img alt="" src={item.licenciaDorsoURL} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} /></a> : "—"}</Box>
        </div>
        <div>
          <Label>Selfie</Label>
          <Box>{item.selfieURL ? <a href={item.selfieURL} target="_blank" rel="noreferrer"><img alt="" src={item.selfieURL} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} /></a> : "—"}</Box>
        </div>
      </div>

      {/* Nota admin */}
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 12, color: "#6b7280" }}>Nota (opcional, visible para admins)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Motivo o comentario interno…"
          style={{ width: "100%", borderRadius: 8, border: "1px solid #e5e7eb", padding: 8, resize: "vertical" }}
        />
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setStatus("verified")} disabled={busy} style={btnSolid("#10B981")}>Aprobar ✓</button>
        <button onClick={() => setStatus("rejected")} disabled={busy} style={btnSolid("#EF4444")}>Rechazar ✗</button>
        <button onClick={() => setStatus("incomplete")} disabled={busy} style={btnGhost}>Pedir corrección ↩︎</button>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { bg: "#EFF6FF", fg: "#1E40AF", txt: "En revisión" },
    verified: { bg: "#ECFDF5", fg: "#065F46", txt: "Verificado" },
    rejected: { bg: "#FEF2F2", fg: "#7F1D1D", txt: "Rechazado" },
    incomplete: { bg: "#FFF7ED", fg: "#7C2D12", txt: "Incompleto" },
  };
  const s = map[status] || map.incomplete;
  return (
    <span style={{ background: s.bg, color: s.fg, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
      {s.txt}
    </span>
  );
}

/* estilos botones */
const btnSolid = (bg) => ({
  background: bg, color: "#fff", padding: "8px 12px",
  borderRadius: 8, border: "1px solid transparent", fontWeight: 700
});
const btnGhost = {
  background: "#fff", color: "#111827", padding: "8px 12px",
  borderRadius: 8, border: "1px solid #e5e7eb", fontWeight: 600
};
