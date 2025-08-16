import React from "react";
import Badge from "./Badge"
import Avatar from "./ui/Avatar"

export default function Card(
    {
        nickname = "Nombre",
        full_name,
        about_me = "About Me",
        //badges, // toDo: Debería traerse un JSON de badges para el BadgeManager (Futuro, complicado)
        //avatar, // En teoría, no hace falta. El <Avatar /> puede traer esta info por su cuenta
    }
){
    <div style={{width: "100%", padding: "0.5rem", display: "flex", gap: "1rem"}}>
    {/* Foto de perfil */}
    <Avatar/>
    
    {/* Detalles */}
    <div>
        <div style={{fontSize: "2rem", marginBottom: "1rem"}}>{nickname}</div>
        <div style={{fontSize: "1.2rem", marginBottom: "1rem", borderLeft: "2px solid #00000030", padding: "1rem"}}> {about_me} </div>
        <div style={{display: "flex", gap: "1rem"}}>
        {/* ToDo: Generar dinámicamente: */}
        <Badge variant="verificado">Conductor verificado</Badge>
        <Badge variant="rapido">Responde rápido</Badge>
        </div>
    </div>
    </div>
}