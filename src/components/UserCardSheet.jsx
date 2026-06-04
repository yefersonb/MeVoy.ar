import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Shield } from "react-feather";
import { db } from "../firebase";
import StarRating from "./ui/StarRating";
import Spinner from "./common/Spinner";

// ─── Rating row ───────────────────────────────────────────────────────────────

function RatingRow({ label, value, uid }) {
    return (
        <div className="ucs-rating-row">
            <span className="ucs-rating-row__label">{label}</span>
            <span className="ucs-rating-row__widget">
                {/* StarRating uses gradient-${rating} as SVG ID — unique uid prefix avoids
                    collisions when multiple rows have the same numeric value */}
                <StarRating rating={value || 0} key={`${uid}-${label}`} />
            </span>
            <span className="ucs-rating-row__value">
                {value ? value.toFixed(1) : "—"}
            </span>
        </div>
    );
}

// ─── Role-specific rating sections ────────────────────────────────────────────

function DriverRatings({ profile }) {
    const v = profile.valoraciones || {};
    const trips = profile.viajesCompletados || 0;

    return (
        <div className="ucs-section">
            <span className="ucs-section__label">Valoraciones como conductor</span>
            <RatingRow label="Conducción"  value={v.conduccion}  uid="c" />
            <RatingRow label="Puntualidad" value={v.puntualidad} uid="p" />
            <RatingRow label="Amabilidad"  value={v.amabilidad}  uid="a" />
            <RatingRow label="Limpieza"    value={v.limpieza}    uid="l" />
            <span className="ucs-trips">
                {trips} viaje{trips !== 1 ? "s" : ""} completado{trips !== 1 ? "s" : ""}
            </span>
        </div>
    );
}

function PassengerRatings({ profile }) {
    // TODO: populate valoracionesPasajero once passenger review flow is built.
    // Expected schema on usuarios/{uid}:
    //   valoracionesPasajero: { puntualidad: float, comportamiento: float, limpieza: float }
    //   viajesComoPasajero: number
    const v = profile.valoracionesPasajero || {};
    const trips = profile.viajesComoPasajero || 0;

    return (
        <div className="ucs-section">
            <span className="ucs-section__label">Valoraciones como pasajero</span>
            <RatingRow label="Puntualidad"    value={v.puntualidad}    uid="pp" />
            <RatingRow label="Comportamiento" value={v.comportamiento} uid="pc" />
            <RatingRow label="Limpieza"       value={v.limpieza}       uid="pl" />
            <span className="ucs-trips">
                {trips} viaje{trips !== 1 ? "s" : ""} como pasajero
            </span>
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
                        ? <img src={avatarUrl} alt={name} className="ucs-avatar__img" />
                        : <div className="ucs-avatar__placeholder">{name[0]?.toUpperCase()}</div>
                    }
                </div>
                <div className="ucs-identity__info">
                    <div className="ucs-identity__name">
                        {name}
                        {verified && (
                            <span className="ucs-verified-badge" title="Identidad verificada">
                                <Shield size={13} />
                            </span>
                        )}
                    </div>
                    <span className={`booking-status ${isDriver
                        ? "booking-status--confirmed"
                        : "booking-status--pending"}`}
                    >
                        {isDriver ? "Conductor" : "Pasajero"}
                    </span>
                </div>
            </div>

            {/* Role-specific ratings */}
            {isDriver
                ? <DriverRatings  profile={profile} />
                : <PassengerRatings profile={profile} />
            }

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
