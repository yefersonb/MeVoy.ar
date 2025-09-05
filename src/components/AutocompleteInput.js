import React, { useRef, useEffect, useState, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { MAP_LOADER_OPTIONS } from "../googleMapsConfig";

// simple debounce
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function AutocompleteInput({
  placeholder,
  value,
  onChange,
  // opcional: si querés forzar solo selección desde autocomplete
  onlyFromAutocomplete = false,
}) {

const { isLoaded, loadError } = useJsApiLoader(MAP_LOADER_OPTIONS);

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [internalValue, setInternalValue] = useState(
    typeof value === "object" ? value.formatted_address : value || ""
  );
  const [error, setError] = useState(""); // mensaje de validación
  const [validating, setValidating] = useState(false);

  // Sincronizar si el padre cambia el value
  useEffect(() => {
    setInternalValue(typeof value === "object" ? value.formatted_address : value || "");
    setError("");
  }, [value]);

  // Inicializar autocomplete
  useEffect(() => {
    if (
      isLoaded &&
      !loadError &&
      inputRef.current &&
      !autocompleteRef.current &&
      window.google?.maps?.places
    ) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["geocode"],
          componentRestrictions: { country: "AR" }, // mayúsculas
          fields: ["formatted_address", "geometry"], // <- acá el cambio
        }
      );
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (
          place &&
          place.formatted_address &&
          place.geometry &&
          place.geometry.location
        ) {
          setError("");
          const normalized = {
            formatted_address: place.formatted_address,
            geometry: {
              location: {
                lat: () => place.geometry.location.lat(),
                lng: () => place.geometry.location.lng(),
              },
            },
          };
          setInternalValue(normalized.formatted_address);
          onChange(normalized);
        }
      });
    }
  }, [isLoaded, loadError, onChange]);
console.log("GMAPS KEY?", process.env.REACT_APP_GOOGLE_MAPS_API_KEY);

  // Geocode de texto libre (fallback) si no vino place válido
  const geocodeAddress = useCallback(
    async (address) => {
      if (!address || !window.fetch) return null;
      const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (!key) return null;
      try {
        setValidating(true);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
          )}&key=${key}`
        );
        const json = await res.json();
        if (json.status === "OK" && json.results && json.results[0]) {
          const result = json.results[0];
          return {
            formatted_address: result.formatted_address,
            geometry: {
              location: {
                lat: () => result.geometry.location.lat,
                lng: () => result.geometry.location.lng,
              },
            },
          };
        }
      } catch (e) {
        console.warn("Error en geocoding:", e);
      } finally {
        setValidating(false);
      }
      return null;
    },
    []
  );

  // Debounced version para no spamear
  const debouncedGeocode = useRef(
    debounce(async (text) => {
      if (!text) return;
      const geo = await geocodeAddress(text);
      if (geo) {
        setError("");
        setInternalValue(geo.formatted_address);
        onChange(geo);
      } else if (onlyFromAutocomplete) {
        setError("Tenés que elegir una opción de la lista.");
      } else {
        setError("Dirección no reconocida.");
      }
    }, 500)
  ).current;

  const handleChange = (e) => {
    const v = e.target.value;
    setInternalValue(v);
    setError("");
    // si el padre espera solo el string mientras se valida, lo puede recibir
    onChange(v);
  };

  const handleBlur = async () => {
    // Si ya vino un objeto válido no hacemos nada
    if (value && typeof value === "object" && value.geometry) {
      return;
    }
    if (!internalValue) {
      setError("");
      return;
    }
    // Si está configurado para solo autocomplete, validamos que venga de ahí
    if (onlyFromAutocomplete) {
      const geo = await geocodeAddress(internalValue);
      if (geo) {
        setError("");
        setInternalValue(geo.formatted_address);
        onChange(geo);
      } else {
        setError("Tenés que seleccionar una dirección válida de la lista.");
      }
      return;
    }

    // Para texto libre, geocode y aceptamos si es válido
    debouncedGeocode(internalValue);
  };

  if (loadError) return <p>Error cargando Autocomplete</p>;
  if (!isLoaded) return <p>Cargando Autocomplete…</p>;

  const inputStyle = {
    width: "100%",
    padding: "0.5rem",
    margin: "0.5rem 0",
    border: error ? "1px solid #c0392b" : "1px solid #ccc",
    borderRadius: "0.5rem",
    fontFamily: "inherit",
    fontSize: "1rem",
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={!!error}
        style={inputStyle}
      />
      {validating && (
        <div
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12,
          }}
        >
          validando...
        </div>
      )}
      {error && (
        <div
          style={{
            color: "#c0392b",
            fontSize: 12,
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
