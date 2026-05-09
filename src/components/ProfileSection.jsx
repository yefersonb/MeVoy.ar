// src/components/PerfilSection.jsx

/*
  STRICT FORMATTING RULES: DO NOT CHANGE THE FORMATTING OF THIS FILE — IT MAY LOOK NON STANDARD TO YOU BUT IT HAS MEANING TO US
*/

import React, { useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useDriverVerification } from '../hooks/useDriverVerification';


// UI
import InputField from './ui/InputField';
import Badge from './Badge';
import RatingRow from './RatingRow';
import ActionBar from './ActionBar';
import Spinner from './cozyglow/components/Spinners/CozySpinner/CozySpinner';
import ErrorMessage from './common/ErrorMessage';
import UserCard from "./UserCard"
import ProfileProgress from './ui/ProfileProgress/ProfileProgress';
import Rating from './ui/StarRating';

// Icons an dutilities
import Markdown from 'react-markdown';
import Avatar from "./ui/Avatar"
import { Edit3 } from 'react-feather';
import { License } from "./cozyglow/icons/License"
import okdriver from "../assets/badges/conductor_verificado.png"
import goals from "../assets/badges/metas.png"
import CozyBadge from "./ui/CozyBadge"

const ProfileSection = ({
    usuario,
    perfil,
    loading,
    error,
    editMode,
    guardado,
    onEdit,
    onSave,
    onCancel,
    onPerfilChange,
    onPhotoSelected,
    preview,
    uploading,
}) => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loadingVehiculos, setLoadingVehiculos] = useState(true);

    const completadosPercent = perfil.viajesPublicados
        ? Math.round((perfil.viajesCompletados / perfil.viajesPublicados) * 100)
        : 0;

    const valoraciones = perfil.valoraciones || {
        conduccion: 0,
        puntualidad: 0,
        amabilidad: 0,
        limpieza: 0,
    };

    // TODO: Remove if profile percentage display is unwanted (sums: photo, bio, WhatsApp, DOB, vehicle, and doc verification %)
    const { percent: _verDocPct } = useDriverVerification(usuario?.uid);
    const hasFoto = !!(preview || perfil.fotoURL || usuario?.photoURL);
    const perfilPercent = (() => {
        let p = 0;
        if (hasFoto) p += 15;                       // foto
        if (perfil?.descripcion) p += 10;           // bio
        if (perfil?.whatsapp) p += 10;              // contacto
        if (perfil?.fechaNacimiento) p += 10;       // fecha nac.
        if (vehiculos && vehiculos.length > 0) p += 20; // ≥1 vehicle
        const docs = Math.max(0, Math.min(100, _verDocPct || 0));
        p += Math.round(docs * 0.35);               // documentos (DNI/licencia/selfie) hasta +35
        return Math.min(100, p);
    })();

    const loadVehiculos = useCallback(async () => {
        setLoadingVehiculos(true);
        setVehiculos([]);
        if (!auth.currentUser) {
            setLoadingVehiculos(false);
            return;
        }
        try {
            const vehiculosRef = collection(
                db,
                'usuarios',
                auth.currentUser.uid,
                'vehiculos'
            );
            const snap = await getDocs(vehiculosRef);
            const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setVehiculos(lista);
        } catch (e) {
            console.error('Error cargando vehículos en perfil:', e);
        } finally {
            setLoadingVehiculos(false);
        }
    }, []);

    useEffect(() => {
        loadVehiculos();
    }, [loadVehiculos]);

    if (loading) return <Spinner />;
    if (error) return <ErrorMessage error={error} />;

    const avatarSrc = preview || perfil.fotoURL || usuario?.photoURL || null;

    return (
        <div style={{ padding: "0 8px" }}>
            {/* NUEVA TARJETA DE PERFIL */}
            {/* TODO: Move generalized card to ./UserCard.jsx — should use profile context */}

            {/* Barra de progreso del perfil */}
            <ProfileProgress progress={perfilPercent} click={() => { window.location.hash = 'verificacion'; }} />            

            {/* Tarjeta */}
            <div style={{ width: "100%", padding: "0.5rem", display: "flex", gap: "1rem", alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap" }}>
                {/* Foto de perfil */}
                <div style={{ flex: "1 1 12rem", maxWidth: "20%", minWidth: "180px", flexShrink: 0, marginTop: "0.5rem", position: "relative" }}>
                    <Avatar />
                    <div style={{ position: "absolute", bottom: "7%", right: "7%", width: "3rem", height: "3rem", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "1.5rem", backgroundColor: "#0d690d80", border: "1px solid #00ff1560", boxShadow: "0 4px 4px #00000020", color: "#fff", fontSize: "1.5rem" }}>
                        <License size="80%" />
                    </div>
                </div>

                <div style={{ flex: "1 1 30rem", minWidth: "20rem" }}>
                    {/* Introduction */}
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{perfil.nombre}</div>

                    {/* AboutMe + editor */}
                    <div className='markdown-field' style={{ fontSize: "1rem", marginBottom: "1rem", maxHeight: "20rem", overflow: "auto" }}> <Markdown>{perfil.descripcion || ''}</Markdown></div>
                    {editMode && (
                        <div style={{ boxShadow: "inset 0 2px 4px #0002", borderRadius: "10px", position: "relative" }}>
                            <InputField
                                label="" // Acerca de mi... pero mejor que no diga nada por ahora.
                                type="textarea"
                                value={perfil.descripcion || ''}
                                onChange={(e) => onPerfilChange('descripcion', e.target.value)}
                                readOnly={!editMode}
                                placeholder="Contanos algo sobre vos, tus gustos, música favorita, etc."
                            />
                        </div>
                    )}

                    {/* Insignias */}
                    {/* Experimental: Graphic badges */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8}}>
                        <div style={{width: "4rem", height: "4rem", position: "relative"}}>
                            <CozyBadge percentage={100} color="#62c2e9ff"/>
                            <img src={okdriver} style={{width: "4rem", position: "absolute", top: 0, left: 0, transform: "scale(0.75)"}}/>
                        </div>

                        <div style={{width: "4rem", height: "4rem", position: "relative"}}>
                            <CozyBadge percentage={35} color="#00FFAA"/>
                            <img src={goals} style={{width: "4rem", position: "absolute", top: 0, left: 0, transform: "scale(0.75)"}}/>
                        </div>                        
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {/* TODO: Generate dynamically: */}
                        <Badge variant="verificado">Conductor verificado</Badge>
                        <Badge variant="viajes">{completadosPercent === 100 ? '100% viajes completados' : `${completadosPercent}% viajes completados`} </Badge>
                        <Badge variant="rapido">Responde rápido</Badge>

                    </div>
                    
                    {/* End Introduction */}

                    {/* Personal info */}
                    <div>
                        {/* TODO: Replace these inputs with _views_. Only use inputs in an edit panel — this keeps cards generalized for all roles → less code */}
                        <div className='panel'>
                            <InputField
                                label="WhatsApp"
                                type="text"
                                value={perfil.whatsapp || ''}
                                onChange={(e) => onPerfilChange('whatsapp', e.target.value)}
                                readOnly={!editMode}
                                placeholder="Ingresa tu número de WhatsApp"
                            />
                            <InputField
                                label="Fecha de nacimiento"
                                type="date"
                                value={perfil.fechaNacimiento || ''}
                                onChange={(e) => onPerfilChange('fechaNacimiento', e.target.value)}
                                readOnly={!editMode}
                                placeholder="Selecciona tu fecha de nacimiento"
                            />
                        </div>

                        {/* Valoraciones */}
                        <div className='panel'>
                            <h3> Valoraciones de Conductores </h3>
                            <div style={{ borderRadius: "8px", overflow: "hidden" }}>
                                <RatingRow label="Conducción" value={valoraciones.conduccion} />
                                <RatingRow label="Puntualidad" value={valoraciones.puntualidad} />
                                <RatingRow label="Amabilidad" value={valoraciones.amabilidad} />
                                <RatingRow label="Limpieza" value={valoraciones.limpieza} />
                            </div>
                            <div style={{ marginTop: "8px" }}>
                                <span> {perfil.viajesCompletados || 0} viajes completados </span>
                                <div> {completadosPercent}% de éxito </div>
                            </div>
                        </div>
                        {/* Fin Valoraciones */}

                        {/* Vehicles */}
                        <div className='panel'>
                            <h3> Mis Vehículos </h3>
                            {loadingVehiculos ? (
                                <div>
                                    <Spinner />
                                </div>
                            ) : vehiculos.length === 0 ? (
                                <div>
                                    <p>No tienes vehículos registrados</p>
                                    <p>
                                        Agrega tu primer vehículo en la pestaña <strong>Vehículos</strong> para comenzar a ofrecer viajes.
                                    </p>
                                </div>
                            )
                                :
                                (
                                    <div>
                                        {
                                            vehiculos.map
                                                (
                                                    (vehiculo) =>
                                                    (
                                                        <div key={vehiculo.id}>
                                                            <div>
                                                                <span>🚗</span>
                                                            </div>
                                                            <div>
                                                                <div> {vehiculo.modelo || 'Sin modelo especificado'} </div>
                                                                {
                                                                    vehiculo.patente &&
                                                                    (
                                                                        <div> Patente: {vehiculo.patente} </div>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                )
                                        }
                                    </div>
                                )}
                        </div>
                        {/* Fin Vehiculos */}
                    </div>
                    {/* End Personal info */}
                </div>
            </div>
            {/* Fin Tarjeta */}


            {
            <ActionBar
                editMode={editMode}
                onEdit={onEdit}
                onSave={onSave}
                onCancel={onCancel}
                guardado={guardado}
            />
            }
        </div>
    );
};

export default ProfileSection;