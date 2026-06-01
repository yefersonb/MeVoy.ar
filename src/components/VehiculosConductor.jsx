import React, { useState, useEffect, useCallback } from "react";
import { Truck, Plus, Edit2, Trash2, Check, ExternalLink } from "react-feather";
import { useUser } from "../contexts/UserContext";
import { useToast } from "../contexts/ToastContext";
import { db, storage } from "../firebase";
import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc as fsDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import InputField from "./ui/InputField";
import Spinner from "./common/Spinner";

// ─── Seats counter — implements the original TODO ────────────────────────────

function SeatsCounter({ value, onChange }) {
    return (
        <div className="seats-counter">
            <button type="button" className="seats-counter__btn"
                onClick={() => onChange(Math.max(1, value - 1))}>−</button>
            <span className="seats-counter__value">{value}</span>
            <button type="button" className="seats-counter__btn"
                onClick={() => onChange(Math.min(9, value + 1))}>+</button>
        </div>
    );
}

// ─── Document slot picker ─────────────────────────────────────────────────────

function DocPicker({ label, accept = "image/*,application/pdf", file, existingUrl, onSelect, status }) {
    return (
        <div className="doc-picker">
            <span className="doc-picker__label">{label}</span>
            <label className="doc-picker__btn button neutral button--outline">
                {file ? file.name : existingUrl ? "Actualizar" : "Seleccionar"}
                <input
                    type="file" accept={accept}
                    onChange={e => onSelect(e.target.files[0] || null)}
                    style={{ display: "none" }}
                />
            </label>
            {existingUrl && !file && (
                <a href={existingUrl} target="_blank" rel="noreferrer" className="doc-picker__link">
                    <ExternalLink size={12} /> Ver
                </a>
            )}
            {status === "uploading" && <span className="doc-picker__status">Subiendo…</span>}
            {status === "error"     && <span className="doc-picker__status doc-picker__status--error">Error</span>}
            {status === "ok"        && <span className="doc-picker__status doc-picker__status--ok"><Check size={12} /></span>}
        </div>
    );
}

// ─── Doc status chip (view mode) ─────────────────────────────────────────────

function DocChip({ label, url }) {
    if (!url) return (
        <span className="doc-chip doc-chip--missing">{label}</span>
    );
    return (
        <a href={url} target="_blank" rel="noreferrer" className="doc-chip doc-chip--ok">
            <Check size={10} /> {label}
        </a>
    );
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

async function uploadOne(uid, file, folder, vehicleId) {
    if (!file) return null;
    const snap = await uploadBytes(
        storageRef(storage, `${uid}/${folder}/${vehicleId}/${file.name}`),
        file
    );
    return getDownloadURL(snap.ref);
}

async function uploadAllDocs(uid, files, vehicleId, setStatus) {
    const slots = [
        { key: "photo",     folder: "imagen", urlKey: "photoUrl" },
        { key: "cedula",    folder: "cedula", urlKey: "cedulaUrl" },
        { key: "insurance", folder: "seguro", urlKey: "insuranceUrl" },
        { key: "vtv",       folder: "vtv",    urlKey: "vtvUrl" },
    ];
    const updates = {};
    await Promise.all(slots.map(async ({ key, folder, urlKey }) => {
        if (!files[key]) return;
        setStatus(s => ({ ...s, [key]: "uploading" }));
        try {
            const url = await uploadOne(uid, files[key], folder, vehicleId);
            if (url) { updates[urlKey] = url; setStatus(s => ({ ...s, [key]: "ok" })); }
        } catch {
            setStatus(s => ({ ...s, [key]: "error" }));
        }
    }));
    return updates;
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const blankForm = () => ({ brand: "", model: "", year: "", color: "", plate: "", seats: 4 });
const blankFiles = () => ({ photo: null, cedula: null, insurance: null, vtv: null });

// ─── Main component ───────────────────────────────────────────────────────────

export default function VehiculosConductor() {
    const { usuario } = useUser();
    const toast = useToast();

    const [tab, setTab]           = useState("list");
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading]   = useState(true);

    // Add form
    const [form, setForm]         = useState(blankForm());
    const [files, setFiles]       = useState(blankFiles());
    const [uploadStatus, setUploadStatus] = useState({});
    const [saving, setSaving]     = useState(false);

    // Edit state (one at a time)
    const [editId, setEditId]         = useState(null);
    const [editForm, setEditForm]     = useState(blankForm());
    const [editFiles, setEditFiles]   = useState(blankFiles());
    const [editStatus, setEditStatus] = useState({});
    const [editSaving, setEditSaving] = useState(false);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState(null);

    const loadVehiculos = useCallback(async () => {
        if (!usuario) return;
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "usuarios", usuario.uid, "vehiculos"));
            setVehiculos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error loading vehicles:", e);
            toast.error("No se pudieron cargar los vehículos.");
        } finally {
            setLoading(false);
        }
    }, [usuario]);

    useEffect(() => { loadVehiculos(); }, [loadVehiculos]);

    // ── Add ──────────────────────────────────────────────────────────────────

    const handleAdd = async () => {
        if (!usuario) return;
        if (!form.brand || !form.model || !form.year || !form.plate) {
            toast.error("Completá marca, modelo, año y patente."); return;
        }
        setSaving(true);
        try {
            const docRef = await addDoc(
                collection(db, "usuarios", usuario.uid, "vehiculos"),
                { ...form, createdAt: new Date() }
            );
            const docUpdates = await uploadAllDocs(usuario.uid, files, docRef.id, setUploadStatus);
            if (Object.keys(docUpdates).length) {
                await updateDoc(fsDoc(db, "usuarios", usuario.uid, "vehiculos", docRef.id), docUpdates);
            }
            toast.success("Vehículo agregado.");
            setForm(blankForm()); setFiles(blankFiles()); setUploadStatus({});
            await loadVehiculos();
            setTab("list");
        } catch (e) {
            console.error(e);
            toast.error("No se pudo agregar el vehículo.");
        } finally {
            setSaving(false);
        }
    };

    // ── Edit ─────────────────────────────────────────────────────────────────

    const startEdit = (v) => {
        setEditId(v.id);
        setEditForm({ brand: v.brand || "", model: v.model || "", year: v.year || "",
            color: v.color || "", plate: v.plate || "", seats: v.seats || 4 });
        setEditFiles(blankFiles());
        setEditStatus({});
        setDeletingId(null);
    };

    const cancelEdit = () => { setEditId(null); setEditStatus({}); };

    const handleSaveEdit = async (v) => {
        if (!usuario) return;
        if (!editForm.brand || !editForm.model || !editForm.year || !editForm.plate) {
            toast.error("Completá marca, modelo, año y patente."); return;
        }
        setEditSaving(true);
        try {
            const updates = { ...editForm };
            const docUpdates = await uploadAllDocs(usuario.uid, editFiles, v.id, setEditStatus);
            Object.assign(updates, docUpdates);
            await updateDoc(fsDoc(db, "usuarios", usuario.uid, "vehiculos", v.id), updates);
            toast.success("Vehículo actualizado.");
            cancelEdit();
            await loadVehiculos();
        } catch (e) {
            console.error(e);
            toast.error("No se pudo guardar el vehículo.");
        } finally {
            setEditSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = async (id) => {
        try {
            await deleteDoc(fsDoc(db, "usuarios", usuario.uid, "vehiculos", id));
            toast.success("Vehículo eliminado.");
            setDeletingId(null);
            setVehiculos(prev => prev.filter(v => v.id !== id));
        } catch (e) {
            console.error(e);
            toast.error("No se pudo eliminar el vehículo.");
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="rack">

            {/* Tab switcher */}
            <div className="role-switcher">
                <button
                    className={`role-switcher__option${tab === "list" ? " role-switcher__option--active" : ""}`}
                    onClick={() => setTab("list")}
                >
                    Mis vehículos {vehiculos.length > 0 && `(${vehiculos.length})`}
                </button>
                <button
                    className={`role-switcher__option${tab === "add" ? " role-switcher__option--active" : ""}`}
                    onClick={() => setTab("add")}
                >
                    <Plus size={14} /> Agregar
                </button>
            </div>

            {/* ── LIST TAB ── */}
            {tab === "list" && (
                loading ? (
                    <div className="spinner-wrap"><Spinner /></div>
                ) : vehiculos.length === 0 ? (
                    <div className="bookings-empty">
                        <Truck size={36} />
                        <p>No tenés vehículos registrados.</p>
                        <p className="bookings-empty__hint">
                            Agregá tu primer vehículo para poder publicar viajes.
                        </p>
                        <button className="button" onClick={() => setTab("add")}>
                            <Plus size={14} /> Agregar vehículo
                        </button>
                    </div>
                ) : (
                    <div className="rack">
                        {vehiculos.map(v => (
                            <div key={v.id} className="vehicle-card card">

                                {/* Photo */}
                                {v.photoUrl && (
                                    <img src={v.photoUrl} alt={`${v.brand} ${v.model}`}
                                        className="vehicle-card__photo" />
                                )}

                                {editId === v.id ? (
                                    /* ── Edit form ── */
                                    <div className="rack-s">
                                        <div className="trip-search__row" style={{ flexWrap: "wrap" }}>
                                            <div className="trip-search__field">
                                                <InputField label="Marca" value={editForm.brand}
                                                    onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} />
                                            </div>
                                            <div className="trip-search__field">
                                                <InputField label="Modelo" value={editForm.model}
                                                    onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))} />
                                            </div>
                                            <div className="trip-search__field">
                                                <InputField label="Año" value={editForm.year}
                                                    onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))} />
                                            </div>
                                            <div className="trip-search__field">
                                                <InputField label="Color" value={editForm.color}
                                                    onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} />
                                            </div>
                                            <div className="trip-search__field">
                                                <InputField label="Patente" value={editForm.plate}
                                                    onChange={e => setEditForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} />
                                            </div>
                                        </div>

                                        <div className="vehicle-card__seats-row">
                                            <span className="vehicle-card__seats-label">Asientos</span>
                                            <SeatsCounter value={editForm.seats}
                                                onChange={n => setEditForm(f => ({ ...f, seats: n }))} />
                                        </div>

                                        <div className="vehicle-docs-grid">
                                            <DocPicker label="Foto" accept="image/*"
                                                file={editFiles.photo} existingUrl={v.photoUrl}
                                                onSelect={f => setEditFiles(p => ({ ...p, photo: f }))}
                                                status={editStatus.photo} />
                                            <DocPicker label="Cédula"
                                                file={editFiles.cedula} existingUrl={v.cedulaUrl}
                                                onSelect={f => setEditFiles(p => ({ ...p, cedula: f }))}
                                                status={editStatus.cedula} />
                                            <DocPicker label="Seguro"
                                                file={editFiles.insurance} existingUrl={v.insuranceUrl}
                                                onSelect={f => setEditFiles(p => ({ ...p, insurance: f }))}
                                                status={editStatus.insurance} />
                                            <DocPicker label="VTV"
                                                file={editFiles.vtv} existingUrl={v.vtvUrl}
                                                onSelect={f => setEditFiles(p => ({ ...p, vtv: f }))}
                                                status={editStatus.vtv} />
                                        </div>

                                        <div className="row">
                                            <button className="button neutral" onClick={cancelEdit} disabled={editSaving}>
                                                Cancelar
                                            </button>
                                            <button className="button" onClick={() => handleSaveEdit(v)} disabled={editSaving}>
                                                {editSaving ? "Guardando…" : <><Check size={14} /> Guardar</>}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── View mode ── */
                                    <>
                                        <div className="vehicle-card__header">
                                            <div className="vehicle-card__title">
                                                {v.brand} {v.model}
                                                {v.year && <span className="vehicle-card__year">{v.year}</span>}
                                            </div>
                                        </div>

                                        <div className="trip-card__meta">
                                            {v.plate && <span className="trip-card__meta-item">{v.plate}</span>}
                                            {v.color && <span className="trip-card__meta-item">{v.color}</span>}
                                            {v.seats && <span className="trip-card__meta-item">{v.seats} asientos</span>}
                                        </div>

                                        <div className="vehicle-card__docs">
                                            <DocChip label="Cédula"  url={v.cedulaUrl} />
                                            <DocChip label="Seguro"  url={v.insuranceUrl} />
                                            <DocChip label="VTV"     url={v.vtvUrl} />
                                        </div>

                                        {deletingId === v.id ? (
                                            <div className="vehicle-card__confirm-delete">
                                                <span>¿Eliminar este vehículo?</span>
                                                <button className="button" style={{ background: "var(--color-danger)" }}
                                                    onClick={() => handleDelete(v.id)}>
                                                    Eliminar
                                                </button>
                                                <button className="button neutral" onClick={() => setDeletingId(null)}>
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="trip-card__actions">
                                                <button className="button neutral" onClick={() => startEdit(v)}>
                                                    <Edit2 size={13} /> Editar
                                                </button>
                                                <button className="button neutral"
                                                    style={{ color: "var(--color-danger)" }}
                                                    onClick={() => { setDeletingId(v.id); setEditId(null); }}>
                                                    <Trash2 size={13} /> Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── ADD TAB ── */}
            {tab === "add" && (
                <div className="trip-search__form rack">

                    <p className="profile-editor__section-label">Información del vehículo</p>

                    <div className="trip-search__row" style={{ flexWrap: "wrap" }}>
                        <div className="trip-search__field">
                            <InputField label="Marca" value={form.brand} placeholder="Toyota"
                                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                        </div>
                        <div className="trip-search__field">
                            <InputField label="Modelo" value={form.model} placeholder="Corolla"
                                onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                        </div>
                        <div className="trip-search__field">
                            <InputField label="Año" value={form.year} placeholder="2020"
                                onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                        </div>
                        <div className="trip-search__field">
                            <InputField label="Color" value={form.color} placeholder="Blanco"
                                onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                        </div>
                        <div className="trip-search__field">
                            <InputField label="Patente" value={form.plate} placeholder="AA123BB"
                                onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} />
                        </div>
                    </div>

                    <div className="vehicle-card__seats-row">
                        <span className="vehicle-card__seats-label">Asientos</span>
                        <SeatsCounter value={form.seats} onChange={n => setForm(f => ({ ...f, seats: n }))} />
                    </div>

                    <p className="profile-editor__section-label">Foto y documentación</p>

                    <div className="vehicle-docs-grid">
                        <DocPicker label="Foto del vehículo" accept="image/*"
                            file={files.photo} onSelect={f => setFiles(p => ({ ...p, photo: f }))}
                            status={uploadStatus.photo} />
                        {files.photo && (
                            <img src={URL.createObjectURL(files.photo)} alt="Preview"
                                className="vehicle-card__photo-preview" />
                        )}
                        <DocPicker label="Cédula de automotor"
                            file={files.cedula} onSelect={f => setFiles(p => ({ ...p, cedula: f }))}
                            status={uploadStatus.cedula} />
                        <DocPicker label="Seguro"
                            file={files.insurance} onSelect={f => setFiles(p => ({ ...p, insurance: f }))}
                            status={uploadStatus.insurance} />
                        <DocPicker label="VTV"
                            file={files.vtv} onSelect={f => setFiles(p => ({ ...p, vtv: f }))}
                            status={uploadStatus.vtv} />
                    </div>

                    <div className="row">
                        <button className="button neutral" onClick={() => setTab("list")} disabled={saving}>
                            Cancelar
                        </button>
                        <button className="button button--fill" onClick={handleAdd} disabled={saving}>
                            {saving ? "Guardando…" : <><Plus size={14} /> Agregar vehículo</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
