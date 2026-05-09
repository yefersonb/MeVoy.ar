import React, { useState } from "react";
import { db } from "../firebase";
import { useUser } from "../contexts/UserContext";
import { collection, addDoc } from "firebase/firestore";

export default function NewVehicle() {
  const { usuario } = useUser();

  const [datos, setDatos] = useState({
    marca: "",
    modelo: "",
    año: "",
    color: "",
    patente: "",
    fotos: [""],
  });

  const [guardado, setGuardado] = useState(false);

  const handleChange = (e) => {
    setDatos({
      ...datos,
      [e.target.name]: e.target.value,
    });
  };

  const handleFotoChange = (index, value) => {
    const nuevasFotos = [...datos.fotos];
    nuevasFotos[index] = value;
    setDatos({ ...datos, fotos: nuevasFotos });
  };

  const agregarFoto = () => {
    setDatos({ ...datos, fotos: [...datos.fotos, ""] });
  };

  const guardarVehiculo = async () => {
    if (!datos.marca || !datos.modelo || !datos.año) {
      alert("Marca, modelo y año son obligatorios.");
      return;
    }

    const ref = collection(db, `usuarios/${usuario.uid}/vehiculos`);
    await addDoc(ref, {
      ...datos,
      año: parseInt(datos.año),
      creado: new Date(),
      verificado: false,
    });

    setGuardado(true);
    setDatos({
      marca: "",
      modelo: "",
      año: "",
      color: "",
      patente: "",
      fotos: [""],
    });

    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <h2>🚘 Alta de Vehículo</h2>
      <label>
        Marca: <input name="marca" value={datos.marca} onChange={handleChange} />
      </label>
      <br />
      <label>
        Modelo: <input name="modelo" value={datos.modelo} onChange={handleChange} />
      </label>
      <br />
      <label>
        Año: <input name="año" value={datos.año} onChange={handleChange} type="number" />
      </label>
      <br />
      <label>
        Color: <input name="color" value={datos.color} onChange={handleChange} />
      </label>
      <br />
      <label>
        Patente: <input name="patente" value={datos.patente} onChange={handleChange} />
      </label>
      <br />
      <h4>Fotos del vehículo (URLs)</h4>
      {datos.fotos.map((foto, i) => (
        <div key={i}>
          <input
            type="text"
            value={foto}
            onChange={(e) => handleFotoChange(i, e.target.value)}
            placeholder="https://..."
          />
        </div>
      ))}
      <button onClick={agregarFoto}>Agregar otra foto</button>
      <br /><br />
      <button onClick={guardarVehiculo}>Guardar vehículo</button>
      {guardado && <p>✅ Vehículo guardado con éxito</p>}
    </div>
  );
}
