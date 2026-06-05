// Available seats = total seats minus accepted/confirmed/in-transit occupants.
// Requested reservations do NOT consume a seat — only accepted ones do.
export function availableSeats(viaje) {
    return Math.max(0, (viaje?.asientos ?? 0) - (viaje?.occupiedSeats ?? 0));
}
