import React, { useState, useMemo } from "react";
import { Edit2, Check } from "react-feather";
import Markdown from "react-markdown";
import { useUser } from "../contexts/UserContext";
import { useToast } from "../contexts/ToastContext";
import { useProfile } from "../hooks/useProfile";
import usePhotoUpload from "../hooks/usePhotoUpload";
import InputField from "./ui/InputField";
import Toggle from "./ui/Toggle";
import Avatar from "./ui/Avatar";
import Spinner from "./common/Spinner";
import Badge from "./Badge";
import RatingRow from "./RatingRow";

function calcCompletion(profile) {
    if (!profile) return 0;
    let p = 0;
    if (profile.photoUrl)         p += 20;
    if (profile.name?.trim())     p += 20;
    if (profile.whatsapp?.trim()) p += 20;
    if (profile.address?.trim())  p += 20;
    if (profile.bio?.trim())      p += 20;
    return p;
}

export default function TravelerProfilePage() {
    const { usuario } = useUser();
    const toast = useToast();
    const { profile, loading, error, save, canReserve } = useProfile(usuario);

    const [editMode, setEditMode] = useState(false);
    const [draft, setDraft]       = useState(null);
    const [saving, setSaving]     = useState(false);
    const [saved, setSaved]       = useState(false);

    const { uploading, uploadCroppedFile } = usePhotoUpload(usuario?.uid || "");

    const completionPercent = useMemo(() => calcCompletion(profile), [profile]);
    const isDriver = profile?.role === "conductor";

    const startEdit = () => { setDraft({ ...profile }); setEditMode(true); };
    const cancelEdit = () => { setDraft(null); setEditMode(false); };
    const handleChange = (field, value) => setDraft(d => ({ ...d, [field]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await save(draft);
            setSaved(true);
            setEditMode(false);
            setDraft(null);
            toast.success("Perfil actualizado.");
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Profile save error:", e);
            toast.error("No se pudo guardar el perfil.");
        } finally {
            setSaving(false);
        }
    };

    const handlePhoto = async (file) => {
        const url = await uploadCroppedFile(file);
        if (url) {
            try { await save({ photoUrl: url }); }
            catch { toast.error("No se pudo guardar la foto."); }
        } else {
            toast.error("No se pudo subir la foto. Intentá de nuevo.");
        }
    };

    if (loading) return <div className="spinner-wrap"><Spinner /></div>;
    if (error)   return <p style={{ color: "var(--color-danger)", padding: "1rem" }}>{error}</p>;

    const displayed = editMode ? draft : profile;

    return (
        <div className="rack">

            {/* Profile card */}
            <div className="profile-card">
                <div className="profile-card__photo">
                    <Avatar
                        editable={editMode}
                        onCroppedFile={handlePhoto}
                        uploading={uploading}
                    />
                </div>

                <div className="profile-card__info">
                    <div className="profile-card__name">{displayed?.name || "Sin nombre"}</div>
                    {displayed?.email    && <div className="profile-card__meta">{displayed.email}</div>}
                    {displayed?.whatsapp && <div className="profile-card__meta">WhatsApp: {displayed.whatsapp}</div>}
                    {displayed?.address  && <div className="profile-card__meta">{displayed.address}</div>}
                </div>

                {!editMode && (
                    <button className="profile-card__edit-btn" onClick={startEdit} aria-label="Editar perfil">
                        <Edit2 size={18} />
                    </button>
                )}
            </div>

            {/* Thin completion bar — disappears when full */}
            {completionPercent < 100 && (
                <div className="profile-completion-bar">
                    <div className="profile-completion-bar__fill" style={{ width: `${completionPercent}%` }} />
                </div>
            )}

            {/* VIEW MODE */}
            {!editMode && (
                <>
                    {/* Bio */}
                    {displayed?.bio && (
                        <div className="panel profile-bio">
                            <Markdown>{displayed.bio}</Markdown>
                        </div>
                    )}

                    {/* Trust badges — canReserve only makes sense for passengers */}
                    <div className="profile-badges">
                        {!isDriver && canReserve && (
                            <Badge variant="verificado">Perfil completo</Badge>
                        )}
                        {isDriver && profile.tripsCompleted > 0 && (
                            <Badge variant="viajes">
                                {profile.tripsCompleted} viaje{profile.tripsCompleted !== 1 ? "s" : ""}
                            </Badge>
                        )}
                        {isDriver && profile.responseRate > 0 && (
                            <Badge variant="rapido">Responde rápido</Badge>
                        )}
                    </div>

                    {/* Rating */}
                    {profile.ratingCount > 0 && (
                        <div className="profile-ratings">
                            <p className="profile-editor__section-label">Calificación</p>
                            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                                <RatingRow label="Promedio general" value={profile.ratingTotal / profile.ratingCount} />
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* EDIT MODE */}
            {editMode && draft && (
                <div className="profile-editor">
                    <p className="profile-editor__section-label">Información de contacto</p>
                    <div className="profile-editor__group">
                        <InputField
                            label="Nombre completo"
                            value={draft.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="Tu nombre"
                        />
                        <InputField
                            label="WhatsApp"
                            value={draft.whatsapp}
                            onChange={(e) => handleChange("whatsapp", e.target.value)}
                            placeholder="+54 9 3751 XXXX"
                        />
                        <InputField
                            label="Ubicación"
                            value={draft.address}
                            onChange={(e) => handleChange("address", e.target.value)}
                            placeholder="Ciudad, barrio, etc."
                        />
                    </div>

                    <div className="profile-editor__group">
                        <InputField
                            label="Acerca de mí"
                            type="textarea"
                            value={draft.bio}
                            onChange={(e) => handleChange("bio", e.target.value)}
                            placeholder="Contanos algo sobre vos… **negrita**, _itálica_, etc."
                        />
                    </div>

                    <div className="profile-editor__group profile-editor__group--centered">
                        <Toggle
                            checked={draft.profileVisible}
                            onChange={(e) => handleChange("profileVisible", e.target.checked)}
                            label="Mostrar mi perfil al conductor"
                        />
                    </div>

                    <div className="profile-editor__actions">
                        <button className="button neutral" onClick={cancelEdit} disabled={saving}>
                            Cancelar
                        </button>
                        <button className="button" onClick={handleSave} disabled={saving}>
                            {saving ? "Guardando…" : saved
                                ? <><Check size={14} /> Guardado</>
                                : "Guardar cambios"
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
