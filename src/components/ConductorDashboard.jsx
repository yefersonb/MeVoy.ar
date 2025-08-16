//src/components/ConductorDashboard.jsx
import React from "react";
import Perfil from "./PerfilConductorV2Enhanced";

export default function ConductorDashboard({ viajes, reservas }) {
  return <Perfil viajes={viajes} reservas={reservas} />;
}
