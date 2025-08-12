import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function RegistroUsuario() {
  const [whatsapp, setWhatsapp] = useState("");
  const [yaRegistrado, setYaRegistrado] = useState(false);

  useEffect(() => {
    const verificarRegistro = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "usuarios", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setYaRegistrado(true);
        }
      }
    };
    verificarRegistro();
  }, []);

  const registrar = async () => {
    if (!auth.currentUser) return;

    const nombre = auth.currentUser.displayName || "Anónimo";
    const numero = whatsapp.replace(/\D/g, ""); // quita todo menos números
    const numeroFormateado = "+54" + numero;

    try {
      await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
        nombre,
        whatsapp: numeroFormateado,
      });
      alert("Registro completado con éxito.");
      setYaRegistrado(true);
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      alert("Error al registrar usuario.");
    }
  };

  if (yaRegistrado) return null;

  return (
    <div>
      <h3>¡Bienvenido, {auth.currentUser?.displayName}!</h3>
      <p>Por favor, ingresá tu número de WhatsApp para continuar:</p>
      <input
        placeholder="Ej: 3754567890"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
      />
      <button onClick={registrar}>Guardar</button>
    </div>
  );
}
