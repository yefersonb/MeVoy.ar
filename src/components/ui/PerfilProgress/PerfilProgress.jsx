import React from "react";
import { useEffect } from "react";
import { ArrowRight } from "react-feather";
import styles from "./PerfilProgress.module.css"

export default function PerfilProgress({progress, click}) {
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
        setVisible(true);
    }, []);
    
    if(progress == "100") return;

    return (
        <div className={styles.container} onClick={click}>
            <div className={styles.content}>
                <div>¡Seguí completando tu perfil!</div>
                <div style={{marginTop: "10px", width: "100%", color: "white", padding: "2px", backgroundColor: "#3331", borderRadius: "999px", fontWeight: 600}}>
                    <div className={styles.progressbar} style={{width: visible ? `${progress}%` : "0%"}}>{progress}%</div>
                </div>
            </div>
            <ArrowRight style={{margin: "auto"}}/>
        </div>
    );
}