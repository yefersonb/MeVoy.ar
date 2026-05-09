import React from "react";
import { SearchBar } from "../components/ui/SearchBar/SearchBar";

export default function PageMain({ rol }) {
  // To hide search for drivers, uncomment the line below:
  // if (rol === "conductor") return null;
  return (
    <div className="page-main">
      <SearchBar />
    </div>
  );
}
