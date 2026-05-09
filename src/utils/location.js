// src/utils/location.js

export function abbreviateLocation(loc) {
  if (!loc) return loc;
  return loc
    .replace(/Misiones(?: Province)?/g, “Mnes”)
    .replace(/Argentina/g, “AR”);
}