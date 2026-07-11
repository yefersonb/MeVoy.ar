import { doc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Writes a single 1-5 rating from raterUid about targetUid for a given trip.
// Overwrites any previous rating from the same rater (idempotent).
export async function submitRating({ raterUid, targetUid, tripId, rating, comment }) {
    if (!raterUid || !targetUid || !tripId) throw new Error("Missing required rating fields.");
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5.");

    await setDoc(
        doc(db, "viajes", tripId, "ratings", raterUid),
        {
            raterUid,
            targetUid,
            rating,
            comment: comment || null,
            createdAt: serverTimestamp(),
        }
    );

    // Accumulate into the rated user's profile for fast average display.
    // Firestore increment() creates the field if absent.
    await updateDoc(doc(db, "usuarios", targetUid), {
        ratingCount: increment(1),
        ratingTotal: increment(rating),
    });
}
