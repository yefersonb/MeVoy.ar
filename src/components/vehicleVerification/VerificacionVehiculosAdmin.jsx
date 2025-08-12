import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase"; // ✅ Ruta corregida

export default function VerificacionVehiculosAdmin() {
  const [vehiculos, setVehiculos] = useState([]);

  useEffect(() => {
    const obtenerConductoresConVehiculos = async () => {
      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("rol", "==", "conductor"));
      const snapshot = await getDocs(q);
      const lista = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.verificaciones?.ownership?.vehicleId) {
          lista.push({
            id: docSnap.id,
            nombre: data.nombre,
            modelo: data.modeloVehiculo,
            vehicleId: data.verificaciones.ownership.vehicleId,
            verificaciones: data.verificaciones,
          });
        }
      });

      setVehiculos(lista);
    };

    obtenerConductoresConVehiculos();
  }, []);

  const actualizarEstado = async (usuarioId, tipoDoc, nuevoEstado) => {
    const ref = doc(db, "usuarios", usuarioId);

    try {
      await updateDoc(ref, {
        [`verificaciones.${tipoDoc}.status`]: nuevoEstado,
      });

      const usuarioSnap = await getDocs(
        query(collection(db, "usuarios"), where("__name__", "==", usuarioId))
      );

      const userData = usuarioSnap.docs[0].data();
      const verif = {
        ...userData.verificaciones,
        [tipoDoc]: {
          ...userData.verificaciones[tipoDoc],
          status: nuevoEstado,
        },
      };

      const estados = ["ownership", "insurance", "inspection"].map(
        (t) => verif[t]?.status || "pending"
      );

      let overallStatus = "underReview";
      if (estados.every((e) => e === "approved")) {
        overallStatus = "approved";
      } else if (estados.includes("rejected")) {
        overallStatus = "rejected";
      }

      await updateDoc(ref, {
        "verificaciones.overallStatus": overallStatus,
      });

      setVehiculos((prev) =>
        prev.map((v) => {
          if (v.id === usuarioId) {
            return {
              ...v,
              verificaciones: {
                ...verif,
                overallStatus,
              },
            };
          }
          return v;
        })
      );
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      case "underReview":
      default:
        return "bg-yellow-500 text-black";
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Revisión de Vehículos</h2>
      {vehiculos.map((v, idx) => (
        <div
          key={idx}
          className="bg-gray-100 border border-gray-300 rounded-2xl p-4 shadow"
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-semibold">{v.nombre}</h3>
              <p>
                <strong>Vehículo:</strong> {v.modelo}
              </p>
              <p>
                <strong>Patente:</strong> {v.vehicleId}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(
                v.verificaciones.overallStatus
              )}`}
            >
              {v.verificaciones.overallStatus || "underReview"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {["ownership", "insurance", "inspection"].map((tipo, i) => {
              const item = v.verificaciones[tipo];
              return (
                <div
                  key={i}
                  className={`bg-white border rounded-lg p-3 shadow ${
                    item.status === "approved"
                      ? "border-green-500"
                      : item.status === "rejected"
                      ? "border-red-500"
                      : "border-yellow-400"
                  }`}
                >
                  <h4 className="font-bold capitalize">{tipo}</h4>
                  <p>
                    <strong>Estado:</strong> {item.status}
                  </p>
                  {item.expiresAt && (
                    <p>
                      <strong>Vence:</strong> {item.expiresAt}
                    </p>
                  )}
                  <a
                    href={item.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline block mt-2"
                  >
                    Ver documento
                  </a>
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={() => actualizarEstado(v.id, tipo, "approved")}
                      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => actualizarEstado(v.id, tipo, "rejected")}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
