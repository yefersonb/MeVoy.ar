import { doc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Writes a rating from raterUid about targetUid for a given trip.
// Overwrites any previous rating from the same rater (idempotent).
export async function submitRating({ raterUid, targetUid, tripId, ratings, comment }) {
    if (!raterUid || !targetUid || !tripId) throw new Error("Missing required rating fields.");

    const scores = Object.values(ratings).filter(Number.isFinite);
    if (scores.length === 0) throw new Error("No ratings provided.");

    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    await setDoc(
        doc(db, "viajes", tripId, "ratings", raterUid),
        {
            raterUid,
            targetUid,
            ratings,
            average,
            comment: comment || null,
            createdAt: serverTimestamp(),
        }
    );

    // Accumulate into the rated user's profile for fast average display.
    // Firestore increment() creates the field if absent.
    await updateDoc(doc(db, "usuarios", targetUid), {
        ratingCount: increment(1),
        ratingTotal: increment(average),
    });
}
