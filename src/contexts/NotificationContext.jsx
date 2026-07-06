import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    collection, query, where, orderBy, limit,
    onSnapshot, doc, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "./UserContext";

const NOTIFICATIONS_ROUTE = "/notifications";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { usuario } = useUser();
    const uid = usuario?.uid ?? null;

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) { setNotifications([]); setLoading(false); return; }

        const q = query(
            collection(db, "notifications"),
            where("toUid", "==", uid),
            orderBy("createdAt", "desc"),
            limit(40)
        );

        const unsub = onSnapshot(q,
            (snap) => {
                setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("[NotificationContext] snapshot error:", err);
                setLoading(false);
            }
        );

        return unsub;
    }, [uid]);

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read).length,
        [notifications]
    );

    const markRead = useCallback(async (id) => {
        await updateDoc(doc(db, "notifications", id), { read: true });
    }, []);

    const markAllRead = useCallback(async () => {
        const unread = notifications.filter(n => !n.read);
        if (!unread.length) return;
        const batch = writeBatch(db);
        unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
        await batch.commit();
    }, [notifications]);

    // Notifications stay visually unread while the notifications page is open —
    // only a direct click, or navigating away from that page, marks them read.
    // This lives here (above <Routes>, never unmounted) rather than as an
    // unmount effect on the page itself, since React.StrictMode double-invokes
    // mount effects in dev and would fire a false "unmount" on every page load.
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);
    useEffect(() => {
        if (prevPathRef.current === NOTIFICATIONS_ROUTE && location.pathname !== NOTIFICATIONS_ROUTE) {
            markAllRead();
        }
        prevPathRef.current = location.pathname;
    }, [location.pathname, markAllRead]);

    const value = useMemo(
        () => ({ notifications, loading, unreadCount, markRead, markAllRead }),
        [notifications, loading, unreadCount, markRead, markAllRead]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
    return ctx;
}
