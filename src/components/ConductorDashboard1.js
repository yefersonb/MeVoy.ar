import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { useUser } from "../contexts/UserContext";

export default function ConductorDashboard() {
  const { usuario } = useUser();
  const [viajes, setViajes] = useState([]);
  const [reservas, setReservas] = useState({});
  const [perfilPasajero, setPerfilPasajero] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    const q = query(collection(db, "viajes"), orderBy("horario", "asc"));
    const unsubV = onSnapshot(q, (snap) => {
      const viajesFiltrados = snap.docs.filter(
        (d) => d.data().conductor?.uid === usuario.uid
      );
      setViajes(viajesFiltrados.map((d) => ({ id: d.id, ...d.data() })));

      viajesFiltrados.forEach(async (d) => {
        const rs = await getDocs(collection(db, "viajes", d.id, "reservas"));
        setReservas((prev) => ({
          ...prev,
          [d.id]: rs.docs.map((r) => r.data()),
        }));
      });
    });
    return () => unsubV();
  }, [usuario]);

  const abrirPerfilPasajero = async (uid) => {
    if (!uid) {
      console.warn("UID vacío o inválido");
      return;
    }
    console.log("Intentando abrir perfil de pasajero con UID:", uid);
    try {
      const ref = doc(db, "usuarios", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        console.log("Perfil encontrado:", snap.data());
        setPerfilPasajero(snap.data());
      } else {
        console.warn("No se encontró perfil para UID:", uid);
      }
    } catch (e) {
      console.error("Error cargando perfil de pasajero", e);
    }
  };

  const calcularEdad = (fechaNacimientoStr) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimientoStr);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Reservas Recibidas</h2>

      {viajes.map((v) => (
        <div
          key={v.id}
          className="border p-4 rounded-xl shadow mb-4 bg-white"
        >
          <p className="font-semibold">
            {v.origen} → {v.destino}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Vehículo: {v.vehiculo || "—"}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Horario: {new Date(v.horario).toLocaleString()}
          </p>
          <ul>
            {reservas[v.id]?.length ? (
              reservas[v.id].map((r, i) => (
                <li key={i}>
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      console.log("Click en reserva:", r);
                      abrirPerfilPasajero(r.uid);
                    }}
                  >
                    {r.nombre}
                  </button>
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500">Sin reservas aún</li>
            )}
          </ul>
        </div>
      ))}

      {perfilPasajero && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full relative">
            <button
              className="absolute top-2 right-3 text-gray-600 hover:text-black"
              onClick={() => setPerfilPasajero(null)}
            >
              ✖
            </button>
            <div className="flex items-center gap-4 mb-4">
              <img
                src={perfilPasajero.fotoPerfil}
                alt="Perfil"
                className="w-16 h-16 rounded-full object-cover border"
              />
              <div>
                <h3 className="text-lg font-bold">
                  {perfilPasajero.nombre} ({calcularEdad(perfilPasajero.fechaNacimiento)} años)
                </h3>
                <p className="text-sm text-gray-600">
                  WhatsApp: {perfilPasajero.whatsapp || "No disponible"}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Nivel de conducción:</strong> {perfilPasajero.nivelExperiencia || "No especificado"}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Modelo del vehículo:</strong> {perfilPasajero.modeloVehiculo || "No especificado"}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Acerca de mí:</strong> {perfilPasajero.descripcion || "Sin descripción"}
            </p>
            <div className="mb-2">
              <h4 className="text-sm font-semibold mb-1">Preferencias</h4>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {Object.entries(perfilPasajero?.preferencias || {})
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <li key={key}>
                      {{
                        musica: "Le gusta la música",
                        fumar: "Permite fumar",
                        mascotas: "Acepta mascotas",
                        aire: "Usa aire acondicionado",
                        charla: "Le gusta conversar",
                      }[key] || key}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Verificaciones</h4>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {Object.entries(perfilPasajero?.verificaciones || {})
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <li key={key}>
                      {{
                        email: "Correo confirmado",
                        telefono: "Teléfono confirmado",
                        dni: "DNI verificado",
                        licencia: "Licencia de conducir",
                        verificado: "Perfil verificado",
                      }[key] || key}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
