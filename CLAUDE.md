# CLAUDE.md — MeVoy.ar Codebase Guide

This file is the authoritative onboarding document for any LLM or developer
joining this codebase. Read it before making changes.

---

## What this project is

**MeVoy** is an Argentine ride-sharing web app in the style of BlaBlaCar.
Drivers publish trips; travelers search and book seats. A shipment layer allows
passengers to send packages on the same routes.

- **Status**: pre-production / active development
- **Deployed to**: mevoy.ar (Firebase Hosting)
- **Language policy**: all code identifiers and comments in **English**; all
  user-facing strings in **Argentine Spanish**

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App) |
| Routing | React Router v6 |
| Auth | Firebase Auth — Google OAuth only |
| Database | Cloud Firestore (NoSQL) |
| File storage | Firebase Storage |
| Hosting | Firebase Hosting |
| Backend | Express 4 on port 3001 (payments only) |
| Payments | MercadoPago SDK |
| Maps | Google Maps JS API via `@react-google-maps/api` |
| CSS | Custom `cozyglow` theme system (CSS custom properties) |

---

## Running the project

```bash
npm run dev       # frontend (port 3000) + backend (port 3001) concurrently
npm run client    # frontend only
npm run server    # Express backend only
npm run build     # production build
```

The frontend proxies API calls to `http://localhost:3001` (see `proxy` in
`package.json`). The backend is only needed for MercadoPago payment flows.

---

## Environment variables

Create a `.env` file in the project root. The app requires:

```
REACT_APP_GOOGLE_MAPS_API_KEY=...
REACT_APP_RECAPTCHA_V3_SITE_KEY=...
REACT_APP_ENABLE_APPCHECK=0   # set to 1 in production; 0 skips AppCheck in dev
```

Firebase config is hardcoded in `src/firebase.js` (project:
`viajes-compartidos-nativa`). Do not move it to env without updating all
references.

---

## Source tree overview

```
src/
├── App.js                    # root — auth gate, role routing
├── firebase.js               # Firebase init + AppCheck + SDK exports
├── googleMapsConfig.js       # shared loader options (language: es, region: AR)
├── appCheckDebug.js          # sets debug token on localhost (dev only)
├── index.js                  # ReactDOM root, UserProvider, BrowserRouter
│
├── contexts/
│   ├── UserContext.js        # auth state, profile snapshot, admin flag, avatar
│   └── ThemeContext.js       # cozyglow theme switching
│
├── hooks/
│   ├── useAuthRole.js        # standalone auth+role hook (not used by App.js)
│   ├── useConductorData.js   # live subscription: driver's trips + reservations
│   ├── useDriverVerification.js  # driver doc verification status + percent
│   ├── useHashSection.js     # reads window.location.hash → tab name
│   ├── usePerfilData.js      # profile read/write helpers
│   ├── usePhotoUpload.js     # profile photo upload to Storage
│   ├── useResponsive.js      # isMobile breakpoint
│   ├── useTravelerProfileComplete.js  # full profile object + canReserve flag
│   ├── useTravelerProfileMinimal.js   # lightweight: profileComplete boolean
│   ├── useTripsData.js       # driver: publishedTrips, incomingReservations
│   └── useTripsSearch.js     # traveler: filter trips by origin/destination/date
│
├── utils/
│   ├── location.js           # abbreviateLocation(str) helper
│   └── firebaseUtils.js      # misc Firestore helpers
│
├── pages/
│   ├── Main.jsx              # SearchBar wrapper (currently disabled in App.js)
│   └── Profile.jsx           # placeholder profile page
│
├── components/
│   ├── App.js                # (see root)
│   ├── Login.js              # Google sign-in, WhatsApp capture on first login
│   ├── Header.js             # top nav, role toggle, admin mode entry
│   ├── SelectRole.js         # first-time role picker (conductor / viajero)
│   │
│   ├── DriverDashboard.jsx   # thin wrapper → DriverProfile
│   ├── DriverProfile.jsx     # tabbed driver UI (hash-based tabs via Header)
│   ├── DriverScreen.js       # stub (unused)
│   ├── DriverVerificationWizard.jsx  # step-by-step identity + docs upload
│   ├── DriverShipmentPage.jsx / DriverShipmentDetail.jsx  # driver-side envíos
│   │
│   ├── TravelerDashboard.jsx # traveler layout: profile page + trip search
│   ├── TravelerProfilePage.jsx  # tabbed traveler profile
│   ├── TravelerProfile.js    # profile form + usePuedeReservar export
│   ├── TravelersScreen.js    # legacy traveler screen (mostly superseded)
│   ├── TripSearch.js         # search form + results list
│   ├── TripDetail.js         # trip modal: route map, reserve, request shipment
│   ├── TripMap.js            # Google Maps directions renderer
│   ├── RouteMap.js           # simpler map (used in driver flow)
│   ├── TripsSection.jsx      # driver's published trips + incoming reservations
│   ├── IncomingReservations.js  # reservation list for driver
│   ├── PassengerDetail.jsx   # driver view of a specific passenger
│   │
│   ├── NewTrip.js            # publish a trip form
│   ├── NewShipment.jsx       # publish a shipment form
│   ├── NewVehicle.js         # add vehicle form
│   ├── MyShipments.jsx       # traveler's own shipments
│   ├── MyVehicles.js         # driver's vehicle list
│   ├── VehiculosConductor.jsx  # full vehicle management (largest component)
│   ├── AvailableShipments.jsx  # driver: browse open shipment requests
│   ├── AvailableTrips.js     # traveler: browse available trips
│   ├── TripShipments.jsx     # driver: shipments linked to a specific trip
│   ├── RequestShipment.jsx   # traveler: submit a shipment request
│   │
│   ├── ProfileSection.jsx    # driver profile card + badges + vehicles summary
│   ├── AutocompleteInput.js  # Google Places autocomplete with geocode fallback
│   ├── AutoResults.js        # search result cards
│   ├── UserRegistration.js   # WhatsApp capture form
│   ├── RatingModal.js        # post-trip rating UI
│   │
│   ├── admin/
│   │   ├── AdminGuard.jsx    # route guard for admin-only views
│   │   └── AdminVerificador.jsx  # review driver verification submissions
│   │
│   ├── ui/                   # reusable primitives
│   │   ├── Avatar.jsx
│   │   ├── CozyBadge.jsx
│   │   ├── InputField.jsx
│   │   ├── ProfileProgress/ProfileProgress.jsx
│   │   ├── ProgressBar/Basic/Basic.jsx
│   │   ├── SearchBar/SearchBar.jsx
│   │   ├── StarRating.jsx
│   │   └── button.jsx
│   │
│   ├── cozyglow/             # design-system components (Spinners, icons)
│   ├── menus/UserMenuPortal.jsx  # header dropdown via portal
│   ├── verification/SelfieUploaderMobile.jsx  # selfie capture + Storage upload
│   └── vehicleVerification/  # multi-step vehicle verification wizard
│
└── styles/
    ├── cozyglow/             # CSS custom-property theme files
    │   └── color_themes/classic.css
    ├── markdown.css
    └── profile.css
```

---

## Role system

The app has **two user roles** plus an **admin mode**:

| Role | Value in Firestore `usuarios.rol` | Dashboard |
|---|---|---|
| Driver | `"conductor"` | `DriverDashboard` → `DriverProfile` |
| Traveler | `"viajero"` | `TravelerDashboard` |
| Admin | not a role — granted via Firebase custom claim `admin: true` | `AdminVerificador` |

**How role is resolved** (in `App.js`):

1. `useUser()` returns `perfil` (live Firestore snapshot of `usuarios/{uid}`)
2. `rol = perfil?.rol || "viajero"` — defaults to traveler if unset
3. Header toggle calls `setDoc` to flip `rol` in Firestore; context re-renders
4. Admin mode is gated by `isAdmin` (from ID token claims) AND the user
   explicitly clicking "Panel Admin" (`modoVista === "admin"`)

Role is **not** set via React Router — there are no role-based routes. The
entire app renders under one root URL; the active dashboard is chosen by the
`rol` value in the render tree.

---

## Firestore collections

> **Important**: collection and field names are still in Spanish. Do not rename
> them in code without a coordinated Firestore migration. JS identifiers that
> _reference_ these names (variables, props) are in English; the string
> literals themselves are not.

| Collection | Purpose |
|---|---|
| `usuarios` | User profiles. Fields: `rol`, `nombre`, `whatsapp`, `direccion`, `fotoURL`, `fechaNacimiento`, `descripcion`, `perfilVisible` |
| `usuarios/{uid}/vehiculos` | Driver's vehicles (subcollection) |
| `viajes` | Published trips. Fields: `origen`, `destino`, `fecha`, `horario`, `asientos`, `conductor`, `vehiculo`, `aceptaPaquetes`, `pesoMax`, `volumenMax`, `costoBasePaquete` |
| `viajes/{id}/reservas` | Bookings on a trip (subcollection) |
| `envios` | Shipment requests. Fields: `estado` (`"publicado"` \| others), `origen`, `destino`, `precio`, `precioSugerido`, `fotos`, `titulo` |
| `verificaciones` | Driver identity verification. Fields: `status` (`incomplete` \| `pending` \| `verified` \| `rejected`), `nombreCompleto`, `dniNumero`, `dniFrenteURL`, `dniDorsoURL`, `licenciaFrenteURL`, `licenciaDorsoURL`, `selfieURL`, `step` |

---

## Key patterns

### Auth + profile via context

```js
const { usuario, perfil, isAdmin, loading, modoVista } = useUser();
```

`usuario` = Firebase Auth user object  
`perfil` = live Firestore snapshot (`usuarios/{uid}`)  
Never read profile data directly from `auth.currentUser` — always prefer the
context.

### Safe router links

`AvailableShipments.jsx` and `TripShipments.jsx` define a `SafeLink` wrapper
that falls back to `<a href>` when rendered outside a `<Router>`. Copy this
pattern for any component that may be rendered in a context without a router.

### Hash-based tab navigation

`DriverProfile.jsx` and `TravelerProfilePage.jsx` use `useHashSection()` to
map `window.location.hash` → active tab. The `Header.js` menu items set the
hash; the dashboard listens and switches tabs. No React Router involved.

### Firestore boundary

Any function, variable, or prop that _holds_ a Firestore field name as a
string key (e.g. `filters.origen`, `filters.destino`) keeps the Spanish key
because it must match the Firestore schema. This is documented with a comment:
```js
// Filter keys match Firestore field names — pending DB migration
```

---

## Known technical debt

| File / area | Issue |
|---|---|
| `VehiculosConductor.jsx` | Largest and messiest component; not yet refactored |
| `DriverVerificationWizard.jsx` bottom | Contains a dead `export function useVerificacionConductor` block with CommonJS `require()` calls — a GPT artifact, should be deleted |
| `useConductorData.js` | Hook name still uses Spanish `Conductor` — rename to `useDriverData` when touching that file |
| `usePerfilData.js` | Hook name uses Spanish `Perfil` — rename to `useProfileData` |
| `DriverProfile.jsx` | Internal tab labels (`"Verificación"`, `"Envíos"`, etc.) are Spanish UI strings — intentional, keep them |
| Firestore schema | All field and collection names are in Spanish; migration deferred until post-launch with DB access |
| `src/unmojibake.py` | Utility script left in `src/` — does not affect the build |
| `TravelersScreen.js` | Legacy; largely superseded by `TravelerProfilePage.jsx` |

---

## Naming conventions (enforced as of commit `5acc01f`)

- **Files**: PascalCase for components (`DriverProfile.jsx`), camelCase for
  hooks (`useTripsData.js`) and utils (`location.js`)
- **Hook exports**: named exports only, function name matches file name
  (`export function useTripsData()`)
- **Component exports**: default export, function name matches file name
- **Props and variables**: English camelCase
- **CSS class names**: kebab-case with component-scoped prefix  
  (`trip-detail-modal`, `trip-detail-overlay`, etc.)
- **Comments**: English only
- **UI text**: Argentine Spanish (kept in JSX string literals / template literals)

---

## What NOT to do

- **Do not rename Firestore collection/field string literals** without a
  migration plan and DB access
- **Do not add Spanish identifiers** (variable names, function names, file
  names, prop names, CSS class names)
- **Do not use `auth.currentUser` directly** in components — use `useUser()`
- **Do not add Tailwind** — the project uses the custom `cozyglow` CSS system
- **Do not move Firebase config to env** without updating all references and
  CI/CD secrets
