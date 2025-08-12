// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAB4c-_srG-k7qmeBQLD_VTrlNwKgQNolU",
  authDomain: "viajes-compartidos-nativa.firebaseapp.com",
  projectId: "viajes-compartidos-nativa",
  storageBucket: "viajes-compartidos-nativa.firebasestorage.app",  // ← aquí
  messagingSenderId: "874173356390",
  appId: "1:874173356390:web:dbce62df5f5d7a3e01d0a7"
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db      = getFirestore(app);
export const storage = getStorage(app);
