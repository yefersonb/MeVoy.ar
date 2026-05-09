// src/googleMapsConfig.js
export const MAP_LOADER_OPTIONS = {
version: "weekly",
id: "google-map-script",
googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
libraries: ["places", "geometry"],
language: "es",
region: "AR",
};
