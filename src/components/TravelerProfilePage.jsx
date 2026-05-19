import React, { useState, useEffect, useCallback } from "react";
import { Edit2 } from "react-feather";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import usePhotoUpload from "../hooks/usePhotoUpload";
import InputField from "./ui/InputField";
import Toggle from "./ui/Toggle";
import Avatar from "./ui/Avatar";
import Spinner from "./common/Spinner";

const defaultPerfil = {
    nombre: "",
    whatsapp: "",
    email: "",
    descripcion: "",
    fotoURL: "",
    direccion: "",
    perfilVisible: true,
};

export default function TravelerProfilePage() {
    const { usuario } = useUser();

    const [perfil, setPerfil]           = useState(defaultPerfil);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const [editMode, setEditMode]       = useState(false);
    const [saving, setSaving]           = useState(false);
    const [saved, setSaved]             = useState(false);
    const [snapshot, setSnapshot]       = useState(defaultPerfil);

    const { uploading, handlePhotoSelected } = usePhotoUpload(usuario?.uid || "");

    const loadPerfil = useCallback(async () => {
        if (!usuario) return;
        setLoading(true);
        setError(null);
        try {
            const snap = await getDoc(doc(db, "usuarios", usuario.uid));
            const data = snap.exists() ? snap.data() : {};
            const loaded = {
                nombre:        data.nombre        || usuario.displayName || "",
                whatsapp:      data.whatsapp       || "",
                email:         data.email          || usuario.email       || "",
                descripcion:   data.descripcion    || "",
                fotoURL:       data.fotoURL        || usuario.photoURL    || "",
                direccion:     data.direccion      || "",
                perfilVisible: data.perfilVisible  ?? true,
            };
            setPerfil(loaded);
            setSnapshot(loaded);
        } catch (e) {
            console.error("Error cargando perfil:", e);
            setError("No se pudo cargar el perfil.");
        } finally {
            setLoading(false);
        }
    }, [usuario]);

    useEffect(() => { loadPerfil(); }, [loadPerfil]);

    const handleChange = (field, value) =>
        setPerfil((p) => ({ ...p, [field]: value }));

    const handleSave = async () => {
        if (!usuario) return;
        setSaving(true);
        try {
            await setDoc(doc(db, "usuarios", usuario.uid), {
                nombre:        perfil.nombre.trim(),
                whatsapp:      perfil.whatsapp.trim(),
                email:         perfil.email.trim(),
                descripcion:   perfil.descripcion.trim(),
                direccion:     perfil.direccion.trim(),
                perfilVisible: perfil.perfilVisible,
            }, { merge: true });
            setSnapshot(perfil);
            setSaved(true);
            setEditMode(false);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Error guardando perfil:", e);
            alert("No se pudo guardar el perfil.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setPerfil(snapshot);
        setEditMode(false);
    };

    const handlePhoto = async (e) => {
        const url = await handlePhotoSelected(e);
        if (url && usuario) {
            await setDoc(doc(db, "usuarios", usuario.uid), { fotoURL: url }, { merge: true });
        }
    };

    if (loading) return <Spinner />;
    if (error)   return <p style={{ color: "var(--color-danger)", padding: "1rem" }}>{error}</p>;

    return (
        <div className="rack">

            {/* Profile card */}
            <div className="profile-card">
                <div className="profile-card__photo">
                    <Avatar />
                    {editMode && (
                        <label className="profile-card__photo-edit" aria-label="Cambiar foto">
                            <Edit2 size={16} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhoto}
                                disabled={uploading}
                            />
                        </label>
                    )}
                </div>

                <div className="profile-card__info">
                    <div className="profile-card__name">
                        {perfil.nombre || "Sin nombre"}
                    </div>
                    {perfil.email && (
                        <div className="profile-card__meta">{perfil.email}</div>
                    )}
                    {perfil.whatsapp && (
                        <div className="profile-card__meta">WhatsApp: {perfil.whatsapp}</div>
                    )}
                    {perfil.direccion && (
                        <div className="profile-card__meta">{perfil.direccion}</div>
                    )}
                </div>

                {!editMode && (
                    <button
                        className="profile-card__edit-btn"
                        onClick={() => setEditMode(true)}
                        aria-label="Editar perfil"
                    >
                        <Edit2 size={18} />
                    </button>
                )}
            </div>

            {/* Edit form */}
            {editMode && (
                <div className="panel rack">
                    <InputField
                        label="Nombre completo"
                        value={perfil.nombre}
                        onChange={(e) => handleChange("nombre", e.target.value)}
                        placeholder="Tu nombre"
                    />
                    <InputField
                        label="WhatsApp"
                        value={perfil.whatsapp}
                        onChange={(e) => handleChange("whatsapp", e.target.value)}
                        placeholder="+54 9 3751 XXXX"
                    />
                    <InputField
                        label="Dirección"
                        value={perfil.direccion}
                        onChange={(e) => handleChange("direccion", e.target.value)}
                        placeholder="Ciudad, barrio, etc."
                    />
                    
                    <InputField
                        label="Acerca de mí"
                        type="textarea"
                        value={perfil.descripcion}
                        onChange={(e) => handleChange("descripcion", e.target.value)}
                        placeholder="Contanos algo sobre vos"
                    />

                    <Toggle
                        checked={perfil.perfilVisible}
                        onChange={(e) => handleChange("perfilVisible", e.target.checked)}
                        label="Mostrar mi perfil al conductor"
                    />

                    <div className="row">
                        <button
                            className="button"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Guardando…" : saved ? "Guardado" : "Guardar"}
                        </button>
                        <button
                            className="button button--outline"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
