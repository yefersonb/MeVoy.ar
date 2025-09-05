// src/components/NuevoViaje.js
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import AutocompleteInput from "./AutocompleteInput";

export default function NuevoViaje() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState(getDefaultDate());
  const [hora, setHora] = useState(getDefaultTime());
  const [asientos, setAsientos] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
  const [vehiculosCargando, setVehiculosCargando] = useState(true);

  // ðŸ‘‡ Nuevo: estados para Paquetes
  const [aceptaPaquetes, setAceptaPaquetes] = useState(false);
  const [pesoMax, setPesoMax] = useState("");
  const [volumenMax, setVolumenMax] = useState("");
  const [costoBasePaquete, setCostoBasePaquete] = useState("");

  function pad(n) { return String(n).padStart(2, "0"); }
  function getDefaultDate() {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  function getDefaultTime() {
    const now = new Date();
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // Geolocalización para origen (opcional)
  useEffect(() => {
    if (!origen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
          try {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${key}`
            );
            const json = await res.json();
            let raw = json.results?.[0]?.formatted_address || "Ubicación detectada";
            const clean = raw.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2},\s*/, "");
            setOrigen({
              formatted_address: clean,
              geometry: { location: { lat: () => coords.latitude, lng: () => coords.longitude } },
            });
          } catch {
            setOrigen({
              formatted_address: "Ubicación detectada",
              geometry: { location: { lat: () => coords.latitude, lng: () => coords.longitude } },
            });
          }
        },
        () => {}
      );
    }
  }, [origen]);

  // Cargar vehículos
  useEffect(() => {
    const loadVehiculos = async () => {
      setVehiculosCargando(true);
      if (!auth.currentUser) { setVehiculosCargando(false); return; }
      try {
        const vehRef = collection(db, "usuarios", auth.currentUser.uid, "vehiculos");
        const snap = await getDocs(vehRef);
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVehiculos(lista);
        if (lista.length === 1) setVehiculoSeleccionado(lista[0]);
      } catch (e) {
        console.error("Error cargando vehículos para nuevo viaje:", e);
      } finally {
        setVehiculosCargando(false);
      }
    };
    loadVehiculos();
  }, []);

  const inputStyle = {
    width: "100%", padding: "0.5rem", margin: "0.5rem 0",
    border: "1px solid #ccc", borderRadius: "0.5rem",
    fontFamily: "inherit", fontSize: "1rem",
  };

  const publicarViaje = async () => {
    if (!auth.currentUser) { alert("âš ï¸ Iniciá sesión para publicar."); return; }
    if (!origen || !destino || !fecha || !hora) {
      alert("Completá todos los campos obligatorios."); return;
    }
    if (!vehiculoSeleccionado) { alert("Seleccioná un vehículo para el viaje."); return; }

    // Validaciones de paquetes cuando aplica
    if (aceptaPaquetes) {
      if (!pesoMax || !volumenMax || !costoBasePaquete) {
        alert("Completá peso máximo, volumen máximo y costo base de paquete."); return;
      }
      if (Number(pesoMax) <= 0 || Number(volumenMax) <= 0 || Number(costoBasePaquete) <= 0) {
        alert("Los valores de paquetes deben ser mayores a cero."); return;
      }
    }

    setLoading(true);
    try {
      const userRef = doc(db, "usuarios", auth.currentUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) { alert("Usuario no registrado. Completá tu perfil."); return; }
      const u = snap.data();

      if (!u.nombre && !auth.currentUser.displayName) {
        alert("Completá tu nombre en el perfil antes de publicar.");
        return;
      }
      if (!u.whatsapp) {
        alert("Agregá tu WhatsApp en el perfil antes de publicar.");
        return;
      }

      const nombreFinal = u.nombre || auth.currentUser.displayName || "Sin nombre";
      const whatsappFinal = u.whatsapp || "";

      const oStr = typeof origen === "object" ? origen.formatted_address : origen;
      const dStr = typeof destino === "object" ? destino.formatted_address : destino;

      const oCoords = origen?.geometry?.location
        ? { lat: origen.geometry.location.lat(), lng: origen.geometry.location.lng() }
        : null;
      const dCoords = destino?.geometry?.location
        ? { lat: destino.geometry.location.lat(), lng: destino.geometry.location.lng() }
        : null;

      const fechaHora = `${fecha}T${hora}`;

      await addDoc(collection(db, "viajes"), {
        origen: oStr,
        destino: dStr,
        origenCoords: oCoords,
        destinoCoords: dCoords,
        fecha,
        horario: fechaHora,
        asientos,
        creado: new Date(),
        conductor: {
          uid: auth.currentUser.uid,
          nombre: nombreFinal,
          whatsapp: whatsappFinal,
        },
        vehiculo: {
          id: vehiculoSeleccionado.id,
          marca: vehiculoSeleccionado.marca || null,
          modelo: vehiculoSeleccionado.modelo || null,
          patente: vehiculoSeleccionado.patente || null,
          asientos: vehiculoSeleccionado.asientos || null,
        },
        // ðŸ‘‡ NUEVO: configuración de paquetes
        aceptaPaquetes,
        pesoMax: aceptaPaquetes ? Number(pesoMax) : null,            // kg
        volumenMax: aceptaPaquetes ? Number(volumenMax) : null,      // litros
        costoBasePaquete: aceptaPaquetes ? Number(costoBasePaquete) : null, // ARS
      });

      alert("âœ… Viaje publicado");
      // Reset
      setOrigen(""); setDestino("");
      setFecha(getDefaultDate()); setHora(getDefaultTime());
      setAsientos(1); setVehiculoSeleccionado(vehiculos.length === 1 ? vehiculos[0] : null);
      setAceptaPaquetes(false); setPesoMax(""); setVolumenMax(""); setCostoBasePaquete("");
    } catch (e) {
      console.error(e);
      alert("Error al publicar: " + (e.message || "Ocurrió un problema."));
    } finally {
      setLoading(false);
    }
  };

  const incompleto =
    !origen || !destino || !fecha || !hora || asientos < 1 || !vehiculoSeleccionado;

  return (
    <section style={{ padding: "1rem" }}>
      {/* Origen/Destino */}
      <div style={{ margin: "0.5rem 0" }}>
        <label htmlFor="origen" style={{ display: "block", fontWeight: 500 }}>Origen</label>
        <AutocompleteInput
          id="origen"
          placeholder="Ingresa origen"
          value={typeof origen === "object" ? origen.formatted_address : origen}
          onChange={setOrigen}
          style={inputStyle}
        />
      </div>

      <div style={{ margin: "0.5rem 0" }}>
        <label htmlFor="destino" style={{ display: "block", fontWeight: 500 }}>Destino</label>
        <AutocompleteInput
          id="destino"
          placeholder="Ingresa destino"
          value={typeof destino === "object" ? destino.formatted_address : destino}
          onChange={setDestino}
          style={inputStyle}
        />
      </div>

      {/* Fecha/Hora/Asientos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16 }}>
        <div style={{ margin: "0.5rem 0" }}>
          <label htmlFor="fecha" style={{ display: "block", fontWeight: 500 }}>Fecha de viaje</label>
          <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ margin: "0.5rem 0" }}>
          <label htmlFor="hora" style={{ display: "block", fontWeight: 500 }}>Hora de viaje</label>
          <input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ margin: "0.5rem 0" }}>
          <label htmlFor="asientos" style={{ display: "block", fontWeight: 500 }}>Cantidad de asientos</label>
          <input
            id="asientos" type="number" min={1} value={asientos}
            onChange={(e) => setAsientos(+e.target.value)}
            style={{ ...inputStyle, appearance: "auto", MozAppearance: "textfield" }}
          />
        </div>
      </div>

      {/* ðŸ‘‡ NUEVO: Aceptar paquetes */}
      <div style={{ margin: "1rem 0", padding: "12px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={aceptaPaquetes}
            onChange={(e) => setAceptaPaquetes(e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Aceptar paquetes en este viaje</span>
        </label>

        {aceptaPaquetes && (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontWeight: 500 }}>Peso máx. (kg)</label>
              <input
                type="number" min={0} step="0.1" value={pesoMax}
                onChange={(e) => setPesoMax(e.target.value)}
                placeholder="Ej: 20"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 500 }}>Volumen máx. (L)</label>
              <input
                type="number" min={0} step="0.1" value={volumenMax}
                onChange={(e) => setVolumenMax(e.target.value)}
                placeholder="Ej: 100"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 500 }}>Costo base (ARS)</label>
              <input
                type="number" min={0} step="1" value={costoBasePaquete}
                onChange={(e) => setCostoBasePaquete(e.target.value)}
                placeholder="Ej: 3000"
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* Vehículo */}
      <div style={{ margin: "0.5rem 0" }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>Vehículo</div>
        {vehiculosCargando ? (
          <div style={{ color: "#555" }}>Cargando vehículos...</div>
        ) : vehiculos.length === 0 ? (
          <div style={{ color: "#c0392b" }}>
            No tenés vehículos cargados. Agregá uno en la pestaña <strong>Vehículos</strong>.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <select
              aria-label="Seleccionar vehículo"
              value={vehiculoSeleccionado?.id || ""}
              onChange={(e) => {
                const sel = vehiculos.find((v) => v.id === e.target.value);
                setVehiculoSeleccionado(sel || null);
              }}
              style={{ ...inputStyle, maxWidth: 320, flex: "1 1 260px" }}
            >
              <option value="" disabled>Seleccioná vehículo</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {`${v.marca || ""} ${v.modelo || ""}`.trim()} {v.patente ? `- ${v.patente}` : ""}
                </option>
              ))}
            </select>
            {vehiculoSeleccionado && (
              <div
                style={{
                  padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8,
                  background: "#f9fafe", fontSize: 14, display: "flex", gap: 12,
                  alignItems: "center", flexWrap: "wrap",
                }}
              >
                <div>
                  <div>
                    <strong>{vehiculoSeleccionado.marca || "Sin marca"} {vehiculoSeleccionado.modelo || ""}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {vehiculoSeleccionado.patente && <span>Patente: {vehiculoSeleccionado.patente}</span>}
                    {vehiculoSeleccionado.asientos != null && (
                      <span style={{ marginLeft: 8 }}>Asientos: {vehiculoSeleccionado.asientos}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publicar */}
      <button
        onClick={publicarViaje}
        disabled={incompleto || loading}
        className="btn-rounded highlight-hover"
        style={{
          width: "100%", marginTop: 8, padding: "12px", fontWeight: 600,
          borderRadius: 6, border: "none", background: "var(--color-primary-700)", color: "var(--color-surface)",
          cursor: incompleto || loading ? "not-allowed" : "pointer",
          opacity: incompleto || loading ? 0.6 : 1,
        }}
      >
        {loading ? "Publicando..." : "Publicar Viaje"}
      </button>
    </section>
  );
}

