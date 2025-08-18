import React from "react";
import { ArrowRight } from "react-feather";
import styles from "./PerfilProgress.module.css"

export default function PerfilProgress({progress, click}) {
    if(progress == "100") return;
    return (
        <div className={styles.container} onClick={click}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "flex-start", margin: "5px"}}>
                ¡Seguí completando tu perfil!
                <ArrowRight id={styles.arrow}/>
            </div>
            <div style={{width: "100%", color: "white", padding: "2px", backgroundColor: "#3331", borderRadius: "999px", fontWeight: 600}}>
                <div className={styles.progressbar} style={{width: progress + "%"}}>{progress}%</div>
            </div>
        </div>
    );
}