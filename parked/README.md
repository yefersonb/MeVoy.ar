# Parked

Working code that isn't wired into the app right now, kept for reference instead of deleted outright. Check here before building something new — one of these might already solve it.

- **mercadopago-raw-fetch.js** — alternate MP integration (auth/capture/cancel via raw `fetch`, no SDK). Superseded by `server.js`, which uses the official `mercadopago` SDK and is the live path. Revisit if the SDK ever becomes a blocker and a lower-level HTTP approach is needed again.
- **PagoButton.jsx** — early real-checkout button (`/create_preference` → MP redirect). Not imported anywhere; `SimulatorCheckoutModal` is the current checkout UI. Revisit when wiring an actual (non-simulated) MP checkout — note it hardcodes `http://localhost:3001` instead of using the app's relative-path + vite-proxy convention.
