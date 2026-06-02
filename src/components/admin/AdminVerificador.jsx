import { useEffect, useMemo, useRef, useState } from "react";
import {
    collection, doc, getDoc, getDocs, onSnapshot, orderBy,
    query, updateDoc, where, limit, startAfter, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { CheckCircle, XCircle, RotateCcw, Search, FileText } from "react-feather";
import { db, auth } from "../../firebase";
import { useToast } from "../../contexts/ToastContext";
import Spinner from "../common/Spinner";

const TABS = [
    { key: "pending",  label: "Pendientes" },
    { key: "verified", label: "Verificados" },
    { key: "rejected", label: "Rechazados" },
    { key: "all",      label: "Todos" },
];

const STATUS = {
    pending:    { label: "En revisión", cls: "booking-status--pending"   },
    verified:   { label: "Verificado",  cls: "booking-status--confirmed" },
    rejected:   { label: "Rechazado",   cls: "booking-status--rejected"  },
    incomplete: { label: "Incompleto",  cls: "booking-status--rejected"  },
};

// ─── Doc image slot ───────────────────────────────────────────────────────────

function DocSlot({ label, url }) {
    return (
        <div className="admin-doc-slot">
            <span className="admin-doc-slot__label">{label}</span>
            {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="admin-doc-slot__link">
                    <img src={url} alt={label} className="admin-doc-slot__img" />
                    <span className="admin-doc-slot__hint">Abrir</span>
                </a>
            ) : (
                <div className="admin-doc-slot__empty">
                    <FileText size={20} />
                    <span>Sin foto</span>
                </div>
            )}
        </div>
    );
}

// ─── Verification card ────────────────────────────────────────────────────────

function VerifCard({ item }) {
    const toast = useToast();
    const [busy, setBusy]   = useState(false);
    const [note, setNote]   = useState(item.adminNotes || "");
    const [expanded, setExpanded] = useState(true);

    const statusInfo = STATUS[item.status] || STATUS.incomplete;

    const setStatus = async (to) => {
        if (busy) return;
        setBusy(true);
        try {
            const ref  = doc(db, "verificaciones", item.id);
            const snap = await getDoc(ref);
            const from = snap.exists() ? (snap.data().status || "incomplete") : "incomplete";
            const user = auth.currentUser;

            await updateDoc(ref, {
                status:      to,
                adminNotes:  note || null,
                reviewedAt:  serverTimestamp(),
                reviewedBy:  user?.uid || null,
                updatedAt:   serverTimestamp(),
                history: arrayUnion({
                    by:     user?.uid || null,
                    byName: user?.displayName || user?.email || "admin",
                    at:     new Date(),
                    from,
                    to,
                    note:   note || null,
                }),
            });

            const labels = { verified: "aprobada", rejected: "rechazada", incomplete: "marcada como incompleta" };
            toast.success(`Verificación ${labels[to] || "actualizada"}.`);
        } catch (e) {
            console.error("[AdminVerificador] updateDoc error:", e);
            toast.error("No se pudo actualizar. Revisá permisos/reglas.");
        } finally {
            setBusy(false);
        }
    };

    const submittedAt = item.submittedAt?.toDate?.();

    return (
        <div className="admin-verf-card card">
            {/* Header */}
            <button className="admin-verf-card__header" onClick={() => setExpanded(e => !e)}>
                <div className="admin-verf-card__identity">
                    <span className="admin-verf-card__name">
                        {item.nombreCompleto || "(sin nombre)"}
                    </span>
                    <span className="admin-verf-card__dni">
                        DNI {item.dniNumero || "—"}
                    </span>
                </div>
                <div className="admin-verf-card__meta">
                    <span className={`booking-status ${statusInfo.cls}`}>
                        {statusInfo.label}
                    </span>
                    {submittedAt && (
                        <span className="admin-verf-card__date">
                            {submittedAt.toLocaleDateString("es-AR", {
                                day: "numeric", month: "short", year: "numeric",
                            })}
                        </span>
                    )}
                    <span className="admin-verf-card__uid">{item.id}</span>
                </div>
            </button>

            {expanded && (
                <>
                    {/* Document images */}
                    <div className="admin-doc-grid">
                        <DocSlot label="DNI Frente"      url={item.dniFrenteURL} />
                        <DocSlot label="DNI Dorso"       url={item.dniDorsoURL} />
                        <DocSlot label="Licencia Frente" url={item.licenciaFrenteURL} />
                        <DocSlot label="Licencia Dorso"  url={item.licenciaDorsoURL} />
                        <DocSlot label="Selfie"          url={item.selfieURL} />
                    </div>

                    {/* Admin note */}
                    <div className="rack-s">
                        <label className="profile-editor__section-label">
                            Nota interna
                        </label>
                        <textarea
                            className="admin-verf-card__note"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            placeholder="Motivo de rechazo, observaciones…"
                        />
                    </div>

                    {/* Actions */}
                    <div className="admin-verf-card__actions">
                        <button
                            className="button"
                            style={{ background: "var(--color-success)" }}
                            onClick={() => setStatus("verified")}
                            disabled={busy || item.status === "verified"}
                        >
                            <CheckCircle size={15} /> Aprobar
                        </button>
                        <button
                            className="button"
                            style={{ background: "var(--color-danger)" }}
                            onClick={() => setStatus("rejected")}
                            disabled={busy || item.status === "rejected"}
                        >
                            <XCircle size={15} /> Rechazar
                        </button>
                        <button
                            className="button neutral"
                            onClick={() => setStatus("incomplete")}
                            disabled={busy || item.status === "incomplete"}
                        >
                            <RotateCcw size={14} /> Pedir corrección
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminVerificador() {
    const [tab, setTab]       = useState("pending");
    const [search, setSearch] = useState("");
    const [items, setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr]       = useState("");
    const [hasMore, setHasMore] = useState(false);
    const [endCursor, setEndCursor] = useState(null);

    const unsubRef = useRef(null);
    const s = useMemo(() => (search || "").trim().toLowerCase(), [search]);

    useEffect(() => {
        if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
        setLoading(true); setErr(""); setItems([]); setHasMore(false); setEndCursor(null);

        const baseCol = collection(db, "verificaciones");
        const q = tab === "all"
            ? query(baseCol, orderBy("updatedAt", "desc"), limit(30))
            : query(baseCol, where("status", "==", tab), orderBy("updatedAt", "desc"), limit(30));

        const unsub = onSnapshot(q,
            (snap) => {
                const arr = [];
                snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
                setItems(arr);
                setEndCursor(snap.docs[snap.docs.length - 1] || null);
                setHasMore(snap.size === 30);
                setLoading(false);
            },
            async (error) => {
                if (error?.code === "failed-precondition") {
                    try {
                        const q2 = tab === "all"
                            ? query(baseCol, limit(200))
                            : query(baseCol, where("status", "==", tab), limit(200));
                        const snap = await getDocs(q2);
                        const arr = [];
                        snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
                        arr.sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
                        setItems(arr);
                        setErr("Falta índice compuesto — orden aplicado localmente.");
                    } catch (e) {
                        setErr(e?.message || "Error leyendo verificaciones.");
                    } finally { setLoading(false); }
                } else {
                    setErr(error?.message || "Error leyendo verificaciones.");
                    setLoading(false);
                }
            }
        );

        unsubRef.current = unsub;
        return () => { if (unsubRef.current) unsubRef.current(); };
    }, [tab]);

    const loadMore = async () => {
        if (!hasMore || !endCursor) return;
        const baseCol = collection(db, "verificaciones");
        const q = tab === "all"
            ? query(baseCol, orderBy("updatedAt", "desc"), startAfter(endCursor), limit(30))
            : query(baseCol, where("status", "==", tab), orderBy("updatedAt", "desc"), startAfter(endCursor), limit(30));
        const snap = await getDocs(q);
        const arr = [];
        snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
        setItems(prev => [...prev, ...arr]);
        setEndCursor(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.size === 30);
    };

    const filtered = useMemo(() => {
        if (!s) return items;
        return items.filter(it =>
            (it.nombreCompleto || "").toLowerCase().includes(s) ||
            (it.dniNumero || "").toString().includes(s) ||
            (it.id || "").toLowerCase().includes(s)
        );
    }, [items, s]);

    return (
        <div className="rack">

            {/* Tab bar */}
            <div className="admin-tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`admin-tab${tab === t.key ? " admin-tab--active" : ""}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="admin-search">
                <Search size={15} className="admin-search__icon" />
                <input
                    className="admin-search__input"
                    placeholder="Buscar por nombre, DNI o UID…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Index warning */}
            {err && (
                <div className="admin-warning">
                    {err}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="spinner-wrap"><Spinner /></div>
            ) : filtered.length === 0 ? (
                <div className="bookings-empty">
                    <CheckCircle size={36} />
                    <p>
                        {{
                            pending:  "No hay verificaciones pendientes.",
                            verified: "No hay verificaciones aprobadas.",
                            rejected: "No hay verificaciones rechazadas.",
                            all:      "No hay verificaciones.",
                        }[tab]}
                    </p>
                </div>
            ) : (
                <div className="rack">
                    {filtered.map(it => <VerifCard key={it.id} item={it} />)}
                    {hasMore && (
                        <button className="button neutral button--fill" onClick={loadMore}>
                            Cargar más
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
