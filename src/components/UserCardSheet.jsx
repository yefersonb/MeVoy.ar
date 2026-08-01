import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import RatingSummary from "./ui/RatingSummary";
import VerifiedBadge from "./ui/VerifiedBadge";
import Spinner from "./common/Spinner";

// ─── Rating section ────────────────────────────────────────────────────────────

function ProfileRating({ profile, uid }) {
    return (
        <div className="ucs-section">
            <span className="ucs-section__label">Calificación</span>
            <RatingSummary
                ratingCount={profile.ratingCount || 0}
                ratingTotal={profile.ratingTotal || 0}
                uid={uid}
            />
        </div>
    );
}

// ─── Profile content (no sheet chrome — that lives in BottomSheet) ────────────

export default function UserCardContent({ uid, contextRole }) {
    const [profile, setProfile]   = useState(null);
    const [verified, setVerified] = useState(false);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        if (!uid) return;
        setLoading(true);
        Promise.all([
            getDoc(doc(db, "usuarios", uid)),
            getDoc(doc(db, "verificaciones", uid)),
        ]).then(([userSnap, verifSnap]) => {
            setProfile(userSnap.exists() ? userSnap.data() : null);
            setVerified(verifSnap.exists() && verifSnap.data()?.status === "verified");
        }).catch(console.error).finally(() => setLoading(false));
    }, [uid]);

    if (loading) return <div className="ucs-loading"><Spinner /></div>;
    if (!profile) return <div className="ucs-empty">Perfil no disponible.</div>;

    const role     = contextRole || profile?.rol || "viajero";
    const isDriver = role === "conductor";

    const avatarUrl  = profile?.fotoURL || profile?.fotoPerfil || null;
    const name       = profile?.nombre || "Usuario";
    const bio        = profile?.descripcion;
    const bioVisible = profile?.perfilVisible !== false;

    return (
        <div className="ucs-content">
            {/* Avatar + name + role */}
            <div className="ucs-identity">
                <div className="ucs-avatar">
                    {avatarUrl
                        ? <img src={avatarUrl} alt={name} className="ucs-avatar__img" referrerPolicy="no-referrer" />
                        : <div className="ucs-avatar__placeholder">{name[0]?.toUpperCase()}</div>
                    }
                </div>
                <div className="ucs-identity__info">
                    <div className="ucs-identity__name">
                        {name}
                        {verified && <VerifiedBadge label="Identidad verificada" iconOnly />}
                    </div>
                    <span className={`booking-status ${isDriver
                        ? "booking-status--confirmed"
                        : "booking-status--pending"}`}
                    >
                        {isDriver ? "Conductor" : "Pasajero"}
                    </span>
                </div>
            </div>

            {/* Rating */}
            <ProfileRating profile={profile} uid={uid} />

            {/* Bio — after ratings, height-capped so long bios don't dominate */}
            {bio && bioVisible && (
                <div className="ucs-section">
                    <span className="ucs-section__label">Acerca de</span>
                    <p className="ucs-bio">{bio}</p>
                </div>
            )}

            {/* WhatsApp intentionally not shown here — contact happens
                through the booking/reservation flow, not public profiles */}
        </div>
    );
}
