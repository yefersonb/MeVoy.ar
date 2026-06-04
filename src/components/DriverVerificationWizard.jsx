import React, { useEffect, useMemo, useState, useRef } from "react";
import { CheckCircle, Clock, AlertCircle, Camera, Image, ChevronRight, Check, ArrowRight } from "react-feather";
import DocCamera, { ID_CARD_RATIO } from "./common/DocCamera";
import { auth, db, storage } from "../firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    ref as storageRef,
    uploadBytesResumable,
    getDownloadURL,
} from "firebase/storage";
import InputField from "./ui/InputField";
import Spinner from "./common/Spinner";

const COLL         = "verificaciones";
const STORAGE_ROOT = "verificaciones";

const STEPS = [
    { key: "datos",    label: "Tus datos" },
    { key: "dni",      label: "DNI" },
    { key: "licencia", label: "Licencia" },
    { key: "resumen",  label: "Confirmar" },
];

const STATUS_CONFIG = {
    incomplete: { label: "Incompleto",   cls: "verif-status--incomplete", Icon: null },
    pending:    { label: "En revisión",  cls: "verif-status--pending",    Icon: Clock },
    verified:   { label: "Verificado",   cls: "verif-status--verified",   Icon: CheckCircle },
    rejected:   { label: "Rechazado",    cls: "verif-status--rejected",   Icon: AlertCircle },
};

export default function DriverVerificationWizard({ onExit }) {
    const user = auth.currentUser;
    const uid  = user?.uid;

    const [loading,   setLoading]   = useState(true);
    const [saving,    setSaving]    = useState(false);
    const [step,      setStep]      = useState(0);
    const [status,    setStatus]    = useState("incomplete");
    const [error,     setError]     = useState("");
    const [datos,     setDatos]     = useState({ nombreCompleto: "", dniNumero: "" });
    const [urls,      setUrls]      = useState({ dniFrente: "", dniDorso: "", licFrente: "", licDorso: "" });
    const [uploading, setUploading] = useState({});

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!uid) { setLoading(false); return; }
                const ref  = doc(db, COLL, uid);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const d = snap.data();
                    setDatos({ nombreCompleto: d.nombreCompleto || "", dniNumero: d.dniNumero || "" });
                    setUrls({
                        dniFrente: d.dniFrenteURL       || "",
                        dniDorso:  d.dniDorsoURL        || "",
                        licFrente: d.licenciaFrenteURL  || "",
                        licDorso:  d.licenciaDorsoURL   || "",
                    });
                    setStatus(d.status || "incomplete");
                    if (typeof d.step === "number") setStep(d.step);
                } else {
                    await setDoc(ref, { status: "incomplete", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                }
            } catch (e) {
                console.error(e);
                setError("No se pudo cargar tu verificación.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [uid]);

    const pasoCompletado = (idx) => {
        if (idx === 0) return !!(datos.nombreCompleto && datos.dniNumero);
        if (idx === 1) return !!(urls.dniFrente && urls.dniDorso);
        if (idx === 2) return !!(urls.licFrente && urls.licDorso);
        return false;
    };

    const saveProgress = async () => {
        if (!uid) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, COLL, uid), {
                nombreCompleto:   datos.nombreCompleto,
                dniNumero:        datos.dniNumero,
                dniFrenteURL:     urls.dniFrente,
                dniDorsoURL:      urls.dniDorso,
                licenciaFrenteURL: urls.licFrente,
                licenciaDorsoURL: urls.licDorso,
                step,
                status,
                updatedAt: serverTimestamp(),
            });
        } catch (e) {
            console.error(e);
            setError("No se pudo guardar. Revisá tu conexión.");
        } finally {
            setSaving(false);
        }
    };

    const goNext = async () => {
        if (step === 0 && (!datos.nombreCompleto || !datos.dniNumero)) {
            setError("Completá tu nombre y número de DNI para continuar.");
            return;
        }
        if (step === 1 && (!urls.dniFrente || !urls.dniDorso)) {
            setError("Subí el frente y el dorso del DNI.");
            return;
        }
        if (step === 2 && (!urls.licFrente || !urls.licDorso)) {
            setError("Subí el frente y el dorso de la licencia.");
            return;
        }
        setError("");
        await saveProgress();
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const goBack = async () => {
        setError("");
        await saveProgress();
        setStep(s => Math.max(s - 1, 0));
    };

    const onSubmit = async () => {
        setSaving(true);
        setError("");
        try {
            await updateDoc(doc(db, COLL, uid), {
                nombreCompleto:    datos.nombreCompleto,
                dniNumero:         datos.dniNumero,
                dniFrenteURL:      urls.dniFrente,
                dniDorsoURL:       urls.dniDorso,
                licenciaFrenteURL: urls.licFrente,
                licenciaDorsoURL:  urls.licDorso,
                status:            "pending",
                submittedAt:       serverTimestamp(),
                updatedAt:         serverTimestamp(),
            });
            setStatus("pending");
        } catch (e) {
            console.error(e);
            setError("No se pudo enviar a verificación. Intentá de nuevo.");
        } finally {
            setSaving(false);
        }
    };

    const handleFile = async (key, file) => {
        if (!file || !uid) return;
        const maxMB = 8;
        if (file.size > maxMB * 1024 * 1024) { setError(`El archivo supera ${maxMB} MB.`); return; }
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
        if (!allowed.includes(file.type)) { setError("Formato no soportado. Usá JPG, PNG, WebP o HEIC."); return; }

        const path = `${STORAGE_ROOT}/${uid}/${key}/${Date.now()}-${file.name}`;
        const task = uploadBytesResumable(storageRef(storage, path), file, { contentType: file.type });

        return new Promise((resolve, reject) => {
            setUploading(u => ({ ...u, [key]: 0 }));
            task.on("state_changed",
                snap => {
                    setUploading(u => ({ ...u, [key]: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) }));
                },
                err => {
                    console.error(err);
                    setUploading(u => { const n = { ...u }; delete n[key]; return n; });
                    reject(err);
                },
                async () => {
                    const url = await getDownloadURL(task.snapshot.ref);
                    setUrls(prev => ({ ...prev, [key]: url }));
                    setUploading(u => ({ ...u, [key]: 100 }));
                    const fieldMap = {
                        dniFrente: "dniFrenteURL",
                        dniDorso:  "dniDorsoURL",
                        licFrente: "licenciaFrenteURL",
                        licDorso:  "licenciaDorsoURL",
                    };
                    try {
                        await updateDoc(doc(db, COLL, uid), { [fieldMap[key]]: url, updatedAt: serverTimestamp() });
                    } catch {
                        await setDoc(doc(db, COLL, uid), { [fieldMap[key]]: url, updatedAt: serverTimestamp() }, { merge: true });
                    }
                    resolve(url);
                }
            );
        });
    };

    if (loading) return (
        <div className="verif-wizard verif-wizard--loading">
            <Spinner />
        </div>
    );

    if (!uid) return (
        <div className="verif-wizard">
            <p className="verif-error">Tenés que iniciar sesión para verificar tu identidad.</p>
        </div>
    );

    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.incomplete;

    return (
        <div className="verif-wizard">

            {/* Status banner */}
            {status !== "incomplete" && (
                <div className={`verif-status-banner ${cfg.cls}`}>
                    {cfg.Icon && <cfg.Icon size={16} />}
                    <span>{cfg.label}</span>
                    {status === "rejected" && (
                        <span className="verif-status-banner__hint"> — revisá y volvé a enviar</span>
                    )}
                </div>
            )}

            {/* Step progress */}
            <div className="verif-stepper">
                {STEPS.map((s, i) => {
                    const done   = pasoCompletado(i);
                    const active = i === step;
                    return (
                        <div
                            key={s.key}
                            className={[
                                "verif-step",
                                active ? "verif-step--active" : "",
                                done   ? "verif-step--done"   : "",
                            ].filter(Boolean).join(" ")}
                        >
                            <div className="verif-step__icon">
                                {done
                                    ? <Check size={13} strokeWidth={3} />
                                    : <span>{i + 1}</span>
                                }
                            </div>
                            <span className="verif-step__label">{s.label}</span>
                            {i < STEPS.length - 1 && <div className="verif-step__connector" />}
                        </div>
                    );
                })}
            </div>

            {/* Error */}
            {error && <p className="verif-error">{error}</p>}

            {/* Step body */}
            <div className="verif-body">
                {step === 0 && <PasoDatos datos={datos} setDatos={setDatos} />}
                {step === 1 && (
                    <PasoDocumentos
                        title="DNI"
                        frenteKey="dniFrente"
                        dorsoKey="dniDorso"
                        urls={urls}
                        uploading={uploading}
                        onFile={handleFile}
                    />
                )}
                {step === 2 && (
                    <PasoDocumentos
                        title="Licencia de conducir"
                        frenteKey="licFrente"
                        dorsoKey="licDorso"
                        urls={urls}
                        uploading={uploading}
                        onFile={handleFile}
                    />
                )}
                {step === 3 && (
                    <PasoResumen datos={datos} urls={urls} status={status} />
                )}
            </div>

            {/* Navigation */}
            <div className="verif-actions">
                {step > 0 && (
                    <button className="button neutral" onClick={goBack} disabled={saving}>
                        Atrás
                    </button>
                )}
                <div className="verif-actions__right">
                    {step < STEPS.length - 1 ? (
                        <button className="button" onClick={goNext} disabled={saving}>
                            {saving ? "Guardando…" : "Siguiente"}
                            <ArrowRight size={15} />
                        </button>
                    ) : (
                        <button
                            className="button"
                            onClick={onSubmit}
                            disabled={saving || status === "pending" || status === "verified"}
                        >
                            {saving           ? "Enviando…"     :
                             status === "pending"   ? "En revisión"  :
                             status === "verified"  ? "Verificado ✓" :
                             "Enviar a revisión"}
                        </button>
                    )}
                </div>
            </div>

            {onExit && (
                <button className="button neutral button--fill verif-exit-btn" onClick={onExit}>
                    Volver
                </button>
            )}

            <p className="verif-privacy-note">
                Tus datos y documentos se guardan de forma segura y solo los verá el equipo de verificación.
            </p>
        </div>
    );
}

// ── Step components ──────────────────────────────────────────────────────────

function PasoDatos({ datos, setDatos }) {
    return (
        <div className="verif-paso verif-paso--datos">
            <p className="verif-paso__hint">
                Ingresá los datos tal como figuran en tu documento de identidad.
            </p>
            <InputField
                label="Nombre completo"
                value={datos.nombreCompleto}
                onChange={e => setDatos(v => ({ ...v, nombreCompleto: e.target.value }))}
                placeholder="Tal como figura en tu DNI"
            />
            <InputField
                label="Número de DNI"
                value={datos.dniNumero}
                onChange={e => setDatos(v => ({ ...v, dniNumero: e.target.value.replace(/\D/g, "") }))}
                placeholder="Ej. 30123456"
                inputMode="numeric"
            />
        </div>
    );
}

function PasoDocumentos({ title, frenteKey, dorsoKey, urls, uploading, onFile }) {
    return (
        <div className="verif-paso">
            <p className="verif-paso__hint">
                Fotografiá el frente y el dorso de tu {title.toLowerCase()}. Asegurate de que los datos se lean con claridad.
            </p>
            <div className="verif-doc-pair">
                <DocTile
                    label="Frente"
                    url={urls[frenteKey]}
                    progress={uploading[frenteKey]}
                    onSelect={file => onFile(frenteKey, file)}
                />
                <DocTile
                    label="Dorso"
                    url={urls[dorsoKey]}
                    progress={uploading[dorsoKey]}
                    onSelect={file => onFile(dorsoKey, file)}
                />
            </div>
        </div>
    );
}

function PasoResumen({ datos, urls, status }) {
    const allDocs = [
        { label: "DNI — Frente",      url: urls.dniFrente },
        { label: "DNI — Dorso",       url: urls.dniDorso  },
        { label: "Licencia — Frente", url: urls.licFrente },
        { label: "Licencia — Dorso",  url: urls.licDorso  },
    ];
    const allUploaded = allDocs.every(d => d.url);

    return (
        <div className="verif-paso verif-paso--resumen">
            <div className="verif-summary-info">
                <div className="verif-kv">
                    <span className="verif-kv__key">Nombre</span>
                    <span className="verif-kv__val">{datos.nombreCompleto || "—"}</span>
                </div>
                <div className="verif-kv">
                    <span className="verif-kv__key">DNI</span>
                    <span className="verif-kv__val">{datos.dniNumero || "—"}</span>
                </div>
            </div>

            <div className="verif-thumb-grid">
                {allDocs.map(({ label, url }) => (
                    <div key={label} className="verif-thumb">
                        <span className="verif-thumb__label">{label}</span>
                        {url
                            ? <a href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={label} className="verif-thumb__img" />
                              </a>
                            : <div className="verif-thumb__empty">Sin foto</div>
                        }
                    </div>
                ))}
            </div>

            {!allUploaded && (
                <p className="verif-error">Faltan documentos. Volvé y subí todas las fotos.</p>
            )}
        </div>
    );
}

// ── DocTile ──────────────────────────────────────────────────────────────────

function DocTile({ label, url, progress, onSelect }) {
    const fileRef     = useRef(null);
    const [cam, setCam] = useState(false);

    const handleChange = e => {
        const file = e.target.files?.[0];
        if (file) onSelect(file);
        e.target.value = "";
    };

    const isUploading = typeof progress === "number" && progress < 100;

    return (
        <div className="verif-doc-tile">
            <span className="verif-doc-tile__label">{label}</span>

            {/* Preview area */}
            <div className={`verif-doc-tile__preview${url ? " verif-doc-tile__preview--filled" : ""}`}>
                {isUploading ? (
                    <div className="verif-doc-tile__uploading">
                        <div className="verif-doc-tile__progress-bar">
                            <div className="verif-doc-tile__progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span>{progress}%</span>
                    </div>
                ) : url ? (
                    <img src={url} alt={label} className="verif-doc-tile__img" />
                ) : (
                    <span className="verif-doc-tile__placeholder">Sin foto</span>
                )}
            </div>

            {/* Action buttons */}
            <div className="verif-doc-tile__actions">
                <button
                    type="button"
                    className="button neutral verif-doc-tile__btn"
                    onClick={() => setCam(true)}
                    disabled={isUploading}
                >
                    <Camera size={14} />
                    Cámara
                </button>
                <button
                    type="button"
                    className="button neutral verif-doc-tile__btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={isUploading}
                >
                    <Image size={14} />
                    Galería
                </button>
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                style={{ display: "none" }}
            />

            {cam && (
                <DocCamera
                    aspectRatio={ID_CARD_RATIO}
                    label={`Encuadrá el ${label} dentro del marco`}
                    onCapture={file => { setCam(false); onSelect(file); }}
                    onCancel={() => setCam(false)}
                />
            )}
        </div>
    );
}
