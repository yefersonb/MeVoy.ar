import React from "react";

export default function ProgressBar({progress = 50, height = "1.5rem", color= "#0002", background = "#0001", textColor="#fff", type = 0}){
    if (type == 0){
        return(
            <div style={{width: "100%", height: "3rem", display: "flex", justifyContent: "space-around", alignItems: "center", flexDirection: "column"}}>        
                <div style={{fontWeight: 600}}>{progress}%</div>
                <div style={{width: "100%", height: 4, backgroundColor: background}}>
                    <div style={{width: `${progress}%`, height: "100%", transition: "0.3s", backgroundColor: color, }}></div>
                </div>
            </div>
        )
    }
    return(
        <div style={{width: "100%", height: height, backgroundColor: background, borderRadius: 9999, border: "solid 1px #0002", overflow: "hidden"}}>        
            <div style={{width: `${progress}%`, height: "100%", transition: "0.3s", backgroundColor: color, display: "flex", justifyContent: "center", alignItems: "center"}}>
                <div style={{fontWeight: 600, color: textColor}}>{progress}%</div>
            </div>
        </div>
    )
}