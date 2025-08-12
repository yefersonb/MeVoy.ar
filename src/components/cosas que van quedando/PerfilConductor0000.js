import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function PerfilConductor() {
  const { usuario } = useUser();
  const defaultPrefs = { mascotas: false, musica: true, fumar: false, aire: true };

  const [whatsapp, setWhatsapp] = useState("");
  const [hasWhats, setHasWhats] = useState(false);
  const [preferencias, setPreferencias] = useState(defaultPrefs);
  const [guardado, setGuardado] = useState(false);
  const [foto, setFoto] = useState(usuario?.photoURL || "");

  useEffect(() => {
    if (!usuario) return;

    const cargarPerfil = async () => {
      try {
        const ref = doc(db, "usuarios", usuario.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.whatsapp) {
            setWhatsapp(data.whatsapp);
            setHasWhats(true);
          }
          if (data.fotoPerfil) {
            setFoto(data.fotoPerfil);
          }
          setPreferencias((prev) => data.preferencias ?? prev);
        }
      } catch (error) {
        console.error("Error cargando perfil de conductor:", error);
      }
    };

    cargarPerfil();
  }, [usuario]);

  const guardarPerfil = async () => {
    if (!hasWhats && !whatsapp) {
      alert("Por favor, ingresá tu número de WhatsApp");
      return;
    }

    const perfil = {
      nombre: usuario.displayName,
      fotoPerfil: foto,
      rol: "conductor",
      whatsapp,
      preferencias,
      verificado: false,
      fechaRegistro: new Date(),
    };

    try {
      await setDoc(doc(db, "usuarios", usuario.uid), perfil, { merge: true });
      setHasWhats(true);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
      console.log("Perfil conductor guardado:", perfil);
    } catch (error) {
      console.error("Error guardando perfil de conductor:", error);
      alert("Hubo un error al guardar tu perfil. Intentá nuevamente.");
    }
  };

  const handleCheckbox = (e) => {
    setPreferencias((prev) => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 mt-6 border border-gray-200">
      <h2 className="text-2xl font-semibold text-center mb-4">🚗 Perfil del Conductor</h2>

      {/* Foto de perfil */}
      <div className="flex flex-col items-center mb-4">
        <img
          src={foto || "/placeholder.png"}
          alt="Foto del conductor"
          className="w-24 h-24 rounded-full border object-cover"
        />
        <p className="text-sm text-gray-600 mt-2">{usuario?.displayName}</p>
      </div>

      {/* WhatsApp */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Número de WhatsApp</label>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ej: 3751556677"
          disabled={hasWhats}
          className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {hasWhats && (
          <p className="text-xs text-gray-500 mt-1">
            Si necesitás cambiarlo, contactá al soporte.
          </p>
        )}
      </div>

      {/* Preferencias */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold mb-2">Preferencias del viaje</h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(preferencias).map(([key, val]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={key}
                checked={val}
                onChange={handleCheckbox}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              {key === "mascotas" && "Acepta mascotas"}
              {key === "musica" && "Escucha música"}
              {key === "fumar" && "Permite fumar"}
              {key === "aire" && "Usa aire acondicionado"}
            </label>
          ))}
        </div>
      </div>

      {/* Botón guardar */}
      <button
        onClick={guardarPerfil}
        className="w-full mt-6 bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
      >
        Guardar Perfil
      </button>

      {guardado && (
        <p className="mt-3 text-center text-green-600 text-sm">
          ✅ Perfil guardado con éxito
        </p>
      )}
    </div>
  );
}

