import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function PerfilUsuario() {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarWhatsapp = async () => {
      if (!auth.currentUser) return setLoading(false);

      const userRef = doc(db, "usuarios", auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        setWhatsapp(docSnap.data().whatsapp || "");
      }

      setLoading(false);
    };

    cargarWhatsapp();
  }, []);

  const guardarWhatsapp = async () => {
    if (!auth.currentUser) return alert("Debes iniciar sesión primero.");

    try {
      const userRef = doc(db, "usuarios", auth.currentUser.uid);
      await updateDoc(userRef, { whatsapp });
      alert("¡WhatsApp actualizado!");
    } catch (error) {
      console.error(error);
      alert("Error actualizando WhatsApp");
    }
  };

  if (loading) return <p className="text-center text-gray-500">Cargando...</p>;

  return (
    <div className="max-w-md mx-auto mt-6 bg-white shadow-md rounded-2xl p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
        Agregá tu WhatsApp
      </h3>
      <input
        type="text"
        placeholder="Ej: 54937511234567"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />
      <button
        onClick={guardarWhatsapp}
        className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition duration-200"
      >
        Guardar WhatsApp
      </button>
    </div>
  );
}
