// src/components/NuevoEnvio.jsx
import React, { useRef, useState } from "react";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";
import { MAP_LOADER_OPTIONS } from "../googleMapsConfig";
import { db, storage, auth } from "../firebase";

export default function NuevoEnvio() {
  const { isLoaded } = useJsApiLoader(MAP_LOADER_OPTIONS);

  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const origenRef = useRef(null);
  const destinoRef = useRef(null);
  const inputFileRef = useRef(null);

  const onPlacesChanged = (ref, setter) => {
    const place = ref.current?.getPlaces?.()?.[0];
    if (place) setter(place.formatted_address || place.name || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!auth.currentUser) return setError("Iniciá sesión para publicar.");
    const uid = auth.currentUser.uid;

    if (!titulo.trim()) return setError("Falta el título");
    if (!origen.trim() || !destino.trim()) return setError("Completá origen y destino");
    if (!precio || Number(precio) <= 0) return setError("Precio inválido");
    if (files.length === 0) return setError("Subí al menos una foto");

    try {
      setLoading(true);

      // 1) Doc base para aparecer en "disponibles"
      const base = {
        titulo: titulo.trim(),
        origen: origen.trim(),
        destino: destino.trim(),
        precio: Number(precio),
        fotos: [],
        creadorId: uid,
        estado: "publicado",        // <- clave para el listado
        pagoEstado: "pendiente",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "envios"), base);

      // 2) Subir fotos y actualizar
      const urls = [];
      for (const f of files) {
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `envios/${uid}/${docRef.id}/${uuidv4()}.${ext}`;
        const task = uploadBytesResumable(ref(storage, path), f);
        await new Promise((res, rej) => {
          task.on("state_changed", null, rej, res);
        });
        urls.push(await getDownloadURL(task.snapshot.ref));
      }
      await updateDoc(doc(db, "envios", docRef.id), {
        fotos: urls,
        updatedAt: serverTimestamp(),
      });

      // listo
      setTitulo("");
      setPrecio("");
      setOrigen("");
      setDestino("");
      setFiles([]);
      if (inputFileRef.current) inputFileRef.current.value = "";
      alert("Envío publicado 🌟");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al publicar el envío");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return <p>Cargando mapas…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StandaloneSearchBox onLoad={(r) => (origenRef.current = r)} onPlacesChanged={() => onPlacesChanged(origenRef, setOrigen)}>
          <input className="border rounded px-3 py-2 w-full" placeholder="Origen" value={origen} onChange={(e) => setOrigen(e.target.value)} />
        </StandaloneSearchBox>
        <StandaloneSearchBox onLoad={(r) => (destinoRef.current = r)} onPlacesChanged={() => onPlacesChanged(destinoRef, setDestino)}>
          <input className="border rounded px-3 py-2 w-full" placeholder="Destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
        </StandaloneSearchBox>
      </div>

      <input
        type="number"
        min="0"
        className="border rounded px-3 py-2 w-full"
        placeholder="Precio (ARS)"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
      />

      <input
        ref={inputFileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
        {loading ? "Publicando…" : "Publicar envío"}
      </button>
    </form>
  );
}
