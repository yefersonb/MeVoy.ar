# Parked

Working code that isn't wired into the app right now, kept for reference instead of deleted outright. Check here before building something new — one of these might already solve it.

- **mercadopago-raw-fetch.js** — alternate MP integration (auth/capture/cancel via raw `fetch`, no SDK). Superseded by `server.js`, which uses the official `mercadopago` SDK and is the live path. Revisit if the SDK ever becomes a blocker and a lower-level HTTP approach is needed again.
- **PagoButton.jsx** — early real-checkout button (`/create_preference` → MP redirect). Not imported anywhere; `SimulatorCheckoutModal` is the current checkout UI. Revisit when wiring an actual (non-simulated) MP checkout — note it hardcodes `http://localhost:3001` instead of using the app's relative-path + vite-proxy convention.
- **PassengerDetail.jsx** — legacy passenger-profile modal (old "DetalleViajante"). Not imported anywhere; superseded by `UserCardSheet` + `useDrawer()`. Has mojibake encoding bugs from an old copy-paste — needs a rewrite, not a patch, if ever revived.
- **RatingModal.jsx** — earlier single-score (1-5 star) rating modal, superseded when `TripRatingSheet.jsx` was simplified from multi-category to single-score (2026-07-11) and became the live rating UI. Not imported anywhere. Revisit if a full-overlay modal pattern is ever preferred over the bottom-drawer sheet for rating.
