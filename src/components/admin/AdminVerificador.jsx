import { useEffect, useMemo, useRef, useState } from "react";
import {
    collection, collectionGroup, doc, getDoc, getDocs, onSnapshot, orderBy,
    query, updateDoc, where, limit, startAfter, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { CheckCircle, XCircle, RotateCcw, Search, FileText } from "react-feather";
import { CarIcon } from "../common/icons";
import { db, auth } from "../../firebase";
import { useToast } from "../../contexts/ToastContext";
import Spinner from "../common/Spinner";

const STATUS_TABS = [
    { key: "pending",  label: "Pendientes" },
    { key: "verified", label: "Verificados" },
    { key: "rejected", label: "Rechazados" },
    { key: "all",      label: "Todos" },
];

const IDENTITY_STATUS = {
    pending:    { label: "En revisión", cls: "booking-status--pending"   },
    verified:   { label: "Verificado",  cls: "booking-status--confirmed" },
    rejected:   { label: "Rechazado",   cls: "booking-status--rejected"  },
    incomplete: { label: "Incompleto",  cls: "booking-status--rejected"  },
};

const VEHICLE_STATUS = {
    pending:    { label: "Sin revisar", cls: "booking-status--pending"   },
    verified:   { label: "Aprobado",    cls: "booking-status--confirmed" },
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

// Titled section with front + back in a wrapping 2-col row
function DocGroup({ title, frontUrl, backUrl }) {
    return (
        <div className="admin-doc-group">
            <span className="admin-doc-group__title">{title}</span>
            <div className="admin-doc-pair">
                <DocSlot label="Frente" url={frontUrl} />
                <DocSlot label="Dorso"  url={backUrl} />
            </div>
        </div>
    );
}

// ─── Identity card ────────────────────────────────────────────────────────────

function IdentityCard({ item }) {
    const toast = useToast();
    const [busy, setBusy]         = useState(false);
    const [note, setNote]         = useState(item.adminNotes || "");
    const [expanded, setExpanded] = useState(true);

    const statusInfo = IDENTITY_STATUS[item.status] || IDENTITY_STATUS.incomplete;

    const setStatus = async (to) => {
        if (busy) return;
        setBusy(true);
        try {
            const ref  = doc(db, "verificaciones", item.id);
            const snap = await getDoc(ref);
            const from = snap.exists() ? (snap.data().status || "incomplete") : "incomplete";
            const user = auth.currentUser;

            await updateDoc(ref, {
                status:     to,
                adminNotes: note || null,
                reviewedAt: serverTimestamp(),
                reviewedBy: user?.uid || null,
                updatedAt:  serverTimestamp(),
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
        <div className={`admin-verf-card admin-verf-card--${item.status || "incomplete"} card`}>
            <button className="admin-verf-card__header" onClick={() => setExpanded(e => !e)}>
                <div className="admin-verf-card__identity">
                    <span className="admin-verf-card__name">
                        {item.nombreCompleto || "(sin nombre)"}
                    </span>
                    <span className="admin-verf-card__dni">DNI {item.dniNumero || "—"}</span>
                </div>
                <div className="admin-verf-card__meta">
                    <span className={`booking-status ${statusInfo.cls}`}>{statusInfo.label}</span>
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
                    <DocGroup title="DNI"      frontUrl={item.dniFrenteURL}      backUrl={item.dniDorsoURL}      />
                    <DocGroup title="Licencia" frontUrl={item.licenciaFrenteURL} backUrl={item.licenciaDorsoURL} />
                    {item.selfieURL && (
                        <div className="admin-doc-group">
                            <span className="admin-doc-group__title">Selfie</span>
                            <div className="admin-doc-grid admin-doc-grid--solo">
                                <DocSlot label="" url={item.selfieURL} />
                            </div>
                        </div>
                    )}

                    {/* Internal note */}
                    <div className="rack-s">
                        <label className="profile-editor__section-label">Nota interna</label>
                        <textarea
                            className="admin-verf-card__note"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            placeholder="Motivo de rechazo, observaciones…"
                        />
                    </div>

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

// ─── Identity section ─────────────────────────────────────────────────────────

export function IdentitySection() {
    const [tab, setTab]           = useState("pending");
    const [search, setSearch]     = useState("");
    const [items, setItems]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [err, setErr]           = useState("");
    const [hasMore, setHasMore]   = useState(false);
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
            <div className="admin-tabs">
                {STATUS_TABS.map(t => (
                    <button
                        key={t.key}
                        className={`admin-tab${tab === t.key ? " admin-tab--active" : ""}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="admin-search">
                <Search size={15} className="admin-search__icon" />
                <input
                    className="admin-search__input"
                    placeholder="Buscar por nombre, DNI o UID…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {err && <div className="admin-warning">{err}</div>}

            {loading ? (
                <div className="spinner-wrap"><Spinner /></div>
            ) : filtered.length === 0 ? (
                <div className="bookings-empty">
                    <CheckCircle size={36} />
                    <p>{{
                        pending:  "No hay verificaciones pendientes.",
                        verified: "No hay verificaciones aprobadas.",
                        rejected: "No hay verificaciones rechazadas.",
                        all:      "No hay verificaciones.",
                    }[tab]}</p>
                </div>
            ) : (
                <div className="rack">
                    {filtered.map(it => <IdentityCard key={it.id} item={it} />)}
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

// ─── Vehicle card ─────────────────────────────────────────────────────────────

function VehicleCard({ item }) {
    const toast = useToast();
    const [busy, setBusy]         = useState(false);
    const [note, setNote]         = useState(item.adminNotes || "");
    const [expanded, setExpanded] = useState(true);

    const statusInfo = VEHICLE_STATUS[item.adminStatus] || VEHICLE_STATUS.pending;

    // TODO: wire vehicle adminStatus to a real review workflow (notify driver, etc.)
    const setStatus = async (to) => {
        if (busy) return;
        setBusy(true);
        try {
            await updateDoc(doc(db, item._path), {
                adminStatus: to,
                adminNotes:  note || null,
                reviewedAt:  serverTimestamp(),
                reviewedBy:  auth.currentUser?.uid || null,
            });
            const labels = { verified: "aprobado", rejected: "rechazado", incomplete: "marcado como incompleto" };
            toast.success(`Vehículo ${labels[to] || "actualizado"}.`);
        } catch (e) {
            console.error("[AdminVerificador] vehicle updateDoc error:", e);
            toast.error("No se pudo actualizar. Revisá permisos/reglas.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`admin-verf-card admin-verf-card--${item.adminStatus || "pending"} card`}>
            <button className="admin-verf-card__header" onClick={() => setExpanded(e => !e)}>
                <div className="admin-verf-card__identity">
                    <span className="admin-verf-card__name">
                        {[item.brand, item.model, item.year].filter(Boolean).join(" ") || "(sin datos)"}
                    </span>
                    <span className="admin-verf-card__dni">Patente: {item.plate || "—"}</span>
                </div>
                <div className="admin-verf-card__meta">
                    <span className={`booking-status ${statusInfo.cls}`}>{statusInfo.label}</span>
                    <span className="admin-verf-card__uid">{item._ownerId}</span>
                </div>
            </button>

            {expanded && (
                <>
                    <div className="admin-doc-grid">
                        <DocSlot label="Foto del vehículo" url={item.photoUrl} />
                        <DocSlot label="Cédula verde"      url={item.cedulaUrl} />
                        <DocSlot label="Seguro"            url={item.insuranceUrl} />
                        <DocSlot label="VTV"               url={item.vtvUrl} />
                    </div>

                    <div className="rack-s">
                        <label className="profile-editor__section-label">Nota interna</label>
                        <textarea
                            className="admin-verf-card__note"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            placeholder="Motivo de rechazo, observaciones…"
                        />
                    </div>

                    <div className="admin-verf-card__actions">
                        <button
                            className="button"
                            style={{ background: "var(--color-success)" }}
                            onClick={() => setStatus("verified")}
                            disabled={busy || item.adminStatus === "verified"}
                        >
                            <CheckCircle size={15} /> Aprobar
                        </button>
                        <button
                            className="button"
                            style={{ background: "var(--color-danger)" }}
                            onClick={() => setStatus("rejected")}
                            disabled={busy || item.adminStatus === "rejected"}
                        >
                            <XCircle size={15} /> Rechazar
                        </button>
                        <button
                            className="button neutral"
                            onClick={() => setStatus("incomplete")}
                            disabled={busy || item.adminStatus === "incomplete"}
                        >
                            <RotateCcw size={14} /> Pedir corrección
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Vehicle section ──────────────────────────────────────────────────────────

export function VehicleSection() {
    const [search, setSearch]   = useState("");
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr]         = useState("");

    const s = useMemo(() => (search || "").trim().toLowerCase(), [search]);

    useEffect(() => {
        const q = query(collectionGroup(db, "vehiculos"), limit(100));
        const unsub = onSnapshot(q,
            (snap) => {
                const arr = snap.docs.map(d => {
                    const ownerId = d.ref.parent.parent?.id || "";
                    return { id: d.id, _path: d.ref.path, _ownerId: ownerId, ...d.data() };
                });
                setItems(arr);
                setLoading(false);
            },
            (error) => {
                console.error("[AdminVerificador] vehicles snapshot error:", error);
                setErr(error?.message || "Error leyendo vehículos.");
                setLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        if (!s) return items;
        return items.filter(it =>
            (it.brand || "").toLowerCase().includes(s) ||
            (it.model || "").toLowerCase().includes(s) ||
            (it.plate || "").toLowerCase().includes(s) ||
            (it._ownerId || "").toLowerCase().includes(s)
        );
    }, [items, s]);

    return (
        <div className="rack">
            <div className="admin-search">
                <Search size={15} className="admin-search__icon" />
                <input
                    className="admin-search__input"
                    placeholder="Buscar por marca, modelo o patente…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {err && <div className="admin-warning">{err}</div>}

            {loading ? (
                <div className="spinner-wrap"><Spinner /></div>
            ) : filtered.length === 0 ? (
                <div className="bookings-empty">
                    <CarIcon size={36} />
                    <p>No hay vehículos registrados.</p>
                </div>
            ) : (
                <div className="rack">
                    {filtered.map(it => <VehicleCard key={it._path} item={it} />)}
                </div>
            )}
        </div>
    );
}

