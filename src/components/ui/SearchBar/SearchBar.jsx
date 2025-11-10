import React from "react";
import styles from "./SearchBar.module.css";

// Icons
import { Search } from "react-feather"


export function SearchBar({ value, onChange, placeholder = "Buscar viajes..." }) {
  return (
    <div style={{width: "calc(100% - 2rem)", margin: "auto", position: "relative"}}>
      <input
        className={styles['search-bar']}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <Search style={{position: "absolute", right: "1rem", top: "50%", transform: "translateY(-55%)", color: "#fff5"}}/>
    </div>
  );
}