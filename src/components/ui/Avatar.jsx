import React from "react";
import { usePerfilData } from "../hooks/usePerfilData";

/* Avatar automatically renders as a picture using the user's profile picture AKA avatar */
export default function Avatar({ viajes, reservas }) {
  const avatarSrc = preview || perfil.fotoURL || usuario?.photoURL || null;
  return <img src={avatarSrc} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>;
}
