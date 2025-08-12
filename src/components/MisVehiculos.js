import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useUser } from "../contexts/UserContext";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function MisVehiculos() {
  const { usuario } = useUser();
  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) return;

    console.log("Usuario en MisVehiculos:", usuario);

    const fetchVehiculos = async () => {
      setCargando(true);
      try {
        const ref = collection(db, `usuarios/${usuario.uid}/vehiculos`);
        const snapshot = await getDocs(ref);
        const lista = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Vehículos encontrados:", lista);
        setVehiculos(lista);
      } catch (error) {
        console.error("Error al traer vehículos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchVehiculos();
  }, [usuario]);

  const eliminarVehiculo = async (id) => {
    if (!window.confirm("¿Querés eliminar este vehículo?")) return;
    try {
      await deleteDoc(doc(db, `usuarios/${usuario.uid}/vehiculos/${id}`));
      setVehiculos(vehiculos.filter(v => v.id !== id));
    } catch (error) {
      alert("Error al eliminar vehículo");
      console.error(error);
    }
  };

  if (cargando) return <p>Cargando vehículos...</p>;

  if (vehiculos.length === 0) return <p>No tenés vehículos cargados aún.</p>;

  return (
    <div style={{ marginTop: "1rem" }}>
      <h2>🚗 Mis Vehículos</h2>
      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {vehiculos.map((v) => (
          <li key={v.id} style={{ marginBottom: "1rem", borderBottom: "1px solid #ccc", paddingBottom: "1rem" }}>
            <strong>{v.marca} {v.modelo} ({v.año})</strong> <br />
            Color: {v.color || "-"} <br />
            Patente: {v.patente || "-"} <br />
            {v.fotos && v.fotos.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                {v.fotos.map((url, i) =>
                  url ? <img key={i} src={url} alt={`Foto ${i+1}`} style={{ width: "100px", height: "60px", objectFit: "cover", borderRadius: "4px" }} /> : null
                )}
              </div>
            )}
            <button
              onClick={() => eliminarVehiculo(v.id)}
              style={{
                marginTop: "0.5rem",
                backgroundColor: "#e74c3c",
                color: "white",
                border: "none",
                padding: "0.3rem 0.7rem",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Eliminar vehículo
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
