// src/googleMapsConfig.js
export const MAP_LOADER_OPTIONS = {
version: "weekly",
id: "google-map-script",
googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
libraries: ["places", "geometry"],
language: "en",
region: "US",
};
