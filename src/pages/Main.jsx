import React from "react";
import { SearchBar } from "../components/ui/SearchBar/SearchBar";

export default function PageMain({ rol }) {
  // Si querés ocultar la búsqueda para conductor, descomentá la línea:
  // if (rol === "conductor") return null;

  return (
    <div className="page-main">
      <SearchBar />
    </div>
  );
}
