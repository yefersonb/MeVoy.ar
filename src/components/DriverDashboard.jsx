// src/components/DriverDashboard.jsx
import React from "react";
import DriverProfile from "./DriverProfile";

export default function DriverDashboard({ viajes, reservas, onGoToVehicles }) {
  return <DriverProfile viajes={viajes} reservas={reservas} onGoToVehicles={onGoToVehicles} />;
}
