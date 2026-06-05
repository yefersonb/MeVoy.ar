import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const NOTIF_TYPES = {
    NEW_RESERVATION:      "new_reservation",
    RESERVATION_ACCEPTED: "reservation_accepted",
    RESERVATION_REJECTED: "reservation_rejected",
    PAYMENT_CONFIRMED:    "payment_confirmed",
    RESERVATION_CANCELLED:"reservation_cancelled",
    TRIP_STARTED:         "trip_started",
    TRIP_COMPLETED:       "trip_completed",
};

export async function sendNotification(toUid, {
    type,
    message,
    fromUid = null,
    tripId = null,
    reservationId = null,
}) {
    if (!toUid) return;
    try {
        await addDoc(collection(db, "notifications"), {
            toUid,
            fromUid,
            type,
            message,
            read: false,
            createdAt: serverTimestamp(),
            tripId,
            reservationId,
        });
    } catch (e) {
        console.error("[notifications] sendNotification error:", e);
    }
}
