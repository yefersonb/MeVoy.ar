import { useEffect } from "react";
import { User, Check, X, CreditCard, Navigation, Flag, Bell } from "react-feather";
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
    const cfg = TYPE_CONFIG[notif.type] ?? { Icon: Bell, cls: "" };
    const { Icon, cls } = cfg;

    return (
        <div className={`notif-item${notif.read ? " notif-item--read" : ""} ${cls}`}>
            <div className="notif-item__icon">
                <Icon size={15} />
            </div>
            <div className="notif-item__body">
                <p className="notif-item__msg">{notif.message}</p>
                <span className="notif-item__time">{relativeTime(notif.createdAt)}</span>
            </div>
            {!notif.read && <div className="notif-item__dot" />}
        </div>
    );
}

export default function NotificationsPanel() {
    const { notifications, unreadCount, markAllRead } = useNotifications();

    // Auto-mark all as read shortly after panel opens
    useEffect(() => {
        if (unreadCount > 0) {
            const t = setTimeout(markAllRead, 1500);
            return () => clearTimeout(t);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!notifications.length) {
        return (
            <div className="ucs-content notif-panel">
                <div className="notif-panel__empty">
                    <Bell size={32} />
                    <p>No tenés notificaciones.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ucs-content notif-panel">
            {unreadCount > 0 && (
                <div className="notif-panel__top">
                    <span className="notif-panel__count">{unreadCount} sin leer</span>
                    <button className="notif-panel__mark-all" onClick={markAllRead}>
                        Marcar todo como leído
                    </button>
                </div>
            )}
            <div className="notif-panel__list">
                {notifications.map(n => (
                    <NotifItem key={n.id} notif={n} />
                ))}
            </div>
        </div>
    );
}
