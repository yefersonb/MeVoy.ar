// 🔥 Configuración base de Firebase

// Importar funciones necesarias del SDK
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAB4c-_srG-k7qmeBQLD_VTrlNwKgQNolU",
  authDomain: "viajes-compartidos-nativa.firebaseapp.com",
  projectId: "viajes-compartidos-nativa",
  storageBucket: "viajes-compartidos-nativa.appspot.com", // ✅ CORRECTO
  messagingSenderId: "874173356390",
  appId: "1:874173356390:web:dbce62df5f5d7a3e01d0a7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios para usarlos en otros componentes
export const auth = getAuth(app); // Autenticación
export const provider = new GoogleAuthProvider(); // Login con Google
export const db = getFirestore(app); // Firestore (base de datos)
