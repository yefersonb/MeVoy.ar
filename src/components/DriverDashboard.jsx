// src/components/DriverDashboard.jsx
import React from "react";
import DriverProfile from "./DriverProfile";

export default function DriverDashboard({ viajes, reservas }) {
  return <DriverProfile viajes={viajes} reservas={reservas} />;
}
