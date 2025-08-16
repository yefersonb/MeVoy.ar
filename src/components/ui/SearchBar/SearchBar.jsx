import React from "react";
import styles from "./SearchBar.module.css";

// Icons
import { Search } from "react-feather"


export function SearchBar({ value, onChange, placeholder = "Buscar viajes..." }) {
  return (
    <div style={{width: "100%", position: "relative", display: "inline-block"}}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles['search-bar']}
      />
      <Search
        style={{position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#888"}}
      />
    </div>
  );
}