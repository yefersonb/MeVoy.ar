//src/components/ConductorDashboard.jsx
import React from "react";
import PerfilConductorV2 from "./PerfilConductorV2Enhanced";

export default function ConductorDashboard({ viajes, reservas }) {
  return <PerfilConductorV2 viajes={viajes} reservas={reservas} />;
}
