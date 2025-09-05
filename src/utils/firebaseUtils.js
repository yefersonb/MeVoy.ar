import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function createUserIfNotExists(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      createdAt: new Date()
    });
    console.log("👤 Usuario creado en Firestore");
  } else {
    console.log("✅ Usuario ya existe en Firestore");
  }
}
