import React from "react";
import styles from "./StandardLogo.module.css";
import { useTheme } from "../../../contexts/ThemeContext"; // Adjust the path as necessary


// ToDo: This huge path to all depencies is HORRIBLE! — We need to find a more streamlined way to import this
//       or use a more modular approach to our components.
// 
export default function StandardLogo() {
  return (
    <div className={styles.logoContainer}>
      <img
        src={ isDark ? "/assets/logo_mevoy_nobg_dark.png" : "/assets/logo_mevoy_nobg.png" }
        alt="Logo de MeVoy"
        className={styles.logoImage}
      />
    </div>
  );
}