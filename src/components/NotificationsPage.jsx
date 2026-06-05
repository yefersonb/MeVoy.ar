import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, User, Check, X, CreditCard, Navigation, Flag } from "react-feather";
import { useNotifications } from "../contexts/NotificationContext";
import { NOTIF_TYPES } from "../utils/notifications";

const TYPE_CONFIG = {
    [NOTIF_TYPES.NEW_RESERVATION]:       { Icon: User,       cls: "notif-item--request" },
    [NOTIF_TYPES.RESERVATION_ACCEPTED]:  { Icon: Check,      cls: "notif-item--success" },
    [NOTIF_TYPES.RESERVATION_REJECTED]:  { Icon: X,          cls: "notif-item--danger"  },
    [NOTIF_TYPES.PAYMENT_CONFIRMED]:     { Icon: CreditCard, cls: "notif-item--success" },
    [NOTIF_TYPES.RESERVATION_CANCELLED]: { Icon: X,          cls: "notif-item--danger"  },
    [NOTIF_TYPES.TRIP_STARTED]:          { Icon: Navigation, cls: "notif-item--info"    },
    [NOTIF_TYPES.TRIP_COMPLETED]:        { Icon: Flag,       cls: "notif-item--done"    },
};

function relativeTime(ts) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60)    return "Ahora";
    if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function NotifItem({ notif }) {
    const { Icon, cls } = TYPE_CONFIG[notif.type] ?? { Icon: Bell, cls: "" };
    return (
        <div className={`notif-item ${cls}${notif.read ? " notif-item--read" : ""}`}>
            <div className="notif-item__icon"><Icon size={15} /></div>
            <div className="notif-item__body">
                <p className="notif-item__msg">{notif.message}</p>
                <span className="notif-item__time">{relativeTime(notif.createdAt)}</span>
            </div>
            {!notif.read && <span className="notif-item__dot" />}
        </div>
    );
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAllRead } = useNotifications();
    const recent = notifications.slice(0, 12);

    useEffect(() => {
        if (unreadCount > 0) {
            const t = setTimeout(markAllRead, 1000);
            return () => clearTimeout(t);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="notif-page">
            <div className="notif-page__header">
                <button className="notif-page__back" onClick={() => navigate(-1)} aria-label="Volver">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="notif-page__title">Notificaciones</h1>
                {unreadCount > 0 && (
                    <button className="notif-page__mark-all" onClick={markAllRead}>
                        Marcar todo leído
                    </button>
                )}
            </div>

            {recent.length === 0 ? (
                <div className="notif-page__empty">
                    <Bell size={40} />
                    <p>Todavía no tenés notificaciones.</p>
                </div>
            ) : (
                <div className="notif-page__list">
                    {recent.map(n => <NotifItem key={n.id} notif={n} />)}
                </div>
            )}
        </div>
    );
}
