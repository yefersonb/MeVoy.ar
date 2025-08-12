import React from "react";
import styles from "./SearchBar.module.css";

// import icons from "@fortawesome/fontawesome-free/css/all.min.css";


export function SearchBar({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar..."
        className={styles['search-bar']}
      />
    </div>
  );
}