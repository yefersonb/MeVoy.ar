// src/components/SolicitarEnvio.jsx
import React, { useState } from "react";
import AutocompleteInput from "./AutocompleteInput";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function toStr(v) {
  return typeof v === "object" ? v.formatted_address : v || "";
}
function toCoords(v) {
  const loc = v?.geometry?.location;
  return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
}
function rndPIN() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
}

export default function SolicitarEnvio({ viaje, usuario, onClose, onCreated }) {
  const [retiro, setRetiro] = useState("");
  const [entrega, setEntrega] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [volumenL, setVolumenL] = useState("");
  const [fragil, setFragil] = useState(false);
  const [receptorNombre, setReceptorNombre] = useState("");
  const [receptorWhatsapp, setReceptorWhatsapp] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  const valido =
    retiro && entrega &&
    (!pesoKg || Number(pesoKg) >= 0) &&
    (!volumenL || Number(volumenL) >= 0) &&
    receptorNombre && receptorWhatsapp;

  const submit = async (e) => {
    e.preventDefault();
    if (!usuario?.uid) return alert("Iniciá sesión para solicitar un envío.");
    if (!viaje?.id) return alert("Viaje inválido.");

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "viajes", viaje.id, "envios"), {
        viajeId: viaje.id,
        solicitanteUid: usuario.uid,
        creado: serverTimestamp(),
        estado: "pendiente", // pendiente -> aceptado -> retirado -> entregado
        aceptaPaquetes: !!viaje.aceptaPaquetes,
        limitesViaje: {
          pesoMax: viaje.pesoMax ?? null,
          volumenMax: viaje.volumenMax ?? null,
          costoBasePaquete: viaje.costoBasePaquete ?? null,
        },
        retiro: {
          direccion: toStr(retiro),
          coords: toCoords(retiro),
        },
        entrega: {
          direccion: toStr(entrega),
          coords: toCoords(entrega),
        },
        paquete: {
          pesoKg: pesoKg ? Number(pesoKg) : null,
          volumenL: volumenL ? Number(volumenL) : null,
          fragil,
          notas: notas || null,
        },
        receptor: {
          nombre: receptorNombre,
          whatsapp: receptorWhatsapp,
          pinEntrega: rndPIN(), // se usará al confirmar entrega
        },
      });

      alert("Solicitud enviada. El conductor debe aceptarla.");
      onCreated?.(docRef.id);
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el envío.");
    } finally {
      setLoading(false);
    }
  };

  const input = {
    width: "100%", padding: "0.5rem", margin: "0.5rem 0",
    border: "1px solid #ccc", borderRadius: "0.5rem", fontSize: "1rem",
  };
  const label = { display: "block", fontWeight: 600, marginTop: 6 };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "grid", placeItems: "center", zIndex: 50,
      }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: "min(680px, 92vw)", background: "var(--color-surface)", borderRadius: 12,
          padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>Solicitar envío de paquete</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>Ã—</button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          <div>
            <label style={label}>Dirección de retiro</label>
            <AutocompleteInput placeholder="Ej: Av. Siempre Viva 742, Posadas"
              value={retiro} onChange={setRetiro} />
          </div>
          <div>
            <label style={label}>Dirección de entrega</label>
            <AutocompleteInput placeholder="Ej: San Martín 100, Posadas"
              value={entrega} onChange={setEntrega} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            <div>
              <label style={label}>Peso (kg) â€” opcional</label>
              <input type="number" min={0} step="0.1" value={pesoKg} onChange={(e)=>setPesoKg(e.target.value)} style={input} />
            </div>
            <div>
              <label style={label}>Volumen (L) â€” opcional</label>
              <input type="number" min={0} step="0.1" value={volumenL} onChange={(e)=>setVolumenL(e.target.value)} style={input} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26 }}>
              <input id="fragil" type="checkbox" checked={fragil} onChange={(e)=>setFragil(e.target.checked)} />
              <label htmlFor="fragil" style={{ fontWeight: 600, cursor: "pointer" }}>Es frágil</label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <div>
              <label style={label}>Nombre del receptor</label>
              <input value={receptorNombre} onChange={(e)=>setReceptorNombre(e.target.value)} style={input} />
            </div>
            <div>
              <label style={label}>WhatsApp del receptor</label>
              <input value={receptorWhatsapp} onChange={(e)=>setReceptorWhatsapp(e.target.value)} style={input} placeholder="+54 9 ..." />
            </div>
          </div>

          <div>
            <label style={label}>Notas (opcional)</label>
            <textarea rows={3} value={notas} onChange={(e)=>setNotas(e.target.value)} style={{ ...input, resize: "vertical" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "var(--color-surface)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="submit" disabled={!valido || loading}
            style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#10b981", color: "var(--color-surface)", fontWeight: 700, cursor: !valido||loading? "not-allowed":"pointer", opacity: !valido||loading? 0.7:1 }}>
            {loading ? "Enviando..." : "Solicitar envío"}
          </button>
        </div>
      </form>
    </div>
  );
}

