// src/hooks/useHashSection.js
import { useEffect, useState } from "react";

/**
 * Lee window.location.hash y escucha cambios para routing "suave" sin Router.
 * Devuelve el string sin el "#" (ej: "mis-vehiculos").
 */
export default function useHashSection(defaultSection = "") {
  const get = () => (window.location.hash || "").replace("#", "");
  const [section, setSection] = useState(get() || defaultSection);

  useEffect(() => {
    const onChange = () => setSection(get() || defaultSection);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [defaultSection]);

  return section;
}
