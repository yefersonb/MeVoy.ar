import React from "react";
import { SearchBar } from "../components/ui/SearchBar/SearchBar";

export default function PageMain({ rol }) {
  // Si querés ocultar la búsqueda para conductor, descomentá la línea:
  // if (rol === "conductor") return null;

  return (
    <div className="page-main">
      {/* Podés tunear este bloque como “hero” de la home */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 className="title">Encontrá tu próximo viaje</h1>
        <p className="subtitle">Compartí gastos y viajá más barato.</p>
      </div>

      <SearchBar />
    </div>
  );
}
