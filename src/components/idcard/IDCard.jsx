import React from "react";
import styles from "./IDCard.module.css"
import Avatar from "../ui/Avatar";

export default function IDCard(){
    return(
        <div className={styles['card-container']}>
            <div style={{width: "10em", height: "10em"}}>
                <Avatar/>
            </div>
        </div>
    );
};