> **Convención de nombres:** Los nombres de campos y colecciones nuevos deben estar en **inglés**. Los campos existentes en español se documentan tal cual están hoy, pero donde se sugiere un nombre canónico o una migración, ese nombre ya está en inglés.

---

## 🔴 URGENTE — Roto ahora mismo

### 1. Reglas de Storage: las fotos de perfil dan error 403

**Qué pasa:** Cuando un usuario sube su foto de perfil, se guarda en Firebase Storage pero cuando la app intenta mostrarla, el navegador recibe un error 403 (acceso denegado). La foto no se ve.

**Ruta afectada:**
```
perfil-fotos/{userId}
```

**Qué necesitamos:** Que cualquier usuario autenticado pueda *leer* (descargar) fotos de perfil. Solo el dueño puede escribir la suya.

**Regla sugerida:**
```js
match /perfil-fotos/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}
```

---

### 2. Google Maps API Key — necesita facturación activada

**Qué pasa:** El autocompletado de direcciones y los mapas de ruta no funcionan porque la API Key de Google Maps no tiene facturación habilitada en Google Cloud Console.

**Qué hacer:** Ir a [console.cloud.google.com](https://console.cloud.google.com), entrar al proyecto, activar facturación y habilitar estas APIs:
- Maps JavaScript API
- Places API
- Geocoding API
- Directions API

También agregar `http://192.168.1.103:3000` como origen autorizado para pruebas locales desde dispositivos en la red.

---

### 3. Endpoint de backend hardcodeado a localhost

**Qué pasa:** El botón de pago con MercadoPago llama a `http://localhost:3001/create_preference`. Eso solo funciona en la máquina del desarrollador. En producción o en cualquier otro dispositivo, falla silenciosamente.

**Qué hacer:** El backend necesita estar en una URL fija (ya sea el servidor de producción o un túnel de desarrollo), y esa URL tiene que estar en una variable de entorno `VITE_BACKEND_URL`. El cambio en el código lo hacemos nosotros, pero necesitamos saber cuál es la URL del servidor.

---

## 🟡 IMPORTANTE — Inconsistencias que causan bugs

### 4. El campo del rol del usuario: `rol` vs `role`

**Qué pasa:** Algunos documentos en la colección `usuarios` tienen el campo escrito como `rol` (español) y otros como `role` (inglés). La app actualmente lee `rol`. Si un usuario tiene `role` en su documento, la app no va a saber si es conductor o viajero y va a tratarlo como viajero por defecto.

**Qué hacer:** Migrar todos los documentos para que usen `role` (inglés) y eliminar el campo `rol` donde exista. Coordinar con el equipo frontend porque vamos a actualizar el código en simultáneo para que lea el nuevo nombre.

**Valores válidos:** `"conductor"` o `"viajero"` (los valores del campo siguen siendo los mismos)

---

### 5. El UID del pasajero en reservas tiene cuatro nombres distintos

**Qué pasa:** En la subcolección `viajes/{tripId}/reservas`, el campo que identifica al pasajero fue escrito de formas distintas en distintos momentos:
- `uid`
- `viajanteUid`
- `uidPasajero`
- `pasajeroUid`

La app tiene código para normalizar esto, pero es frágil y puede romper funcionalidades como ver los detalles del pasajero o cancelar una reserva.

**Qué hacer:** Migrar todos los documentos para que usen `passengerUid` y eliminar las variantes anteriores. Avisarnos cuando esté listo para actualizar el código en simultáneo.

---

### 6. El campo `horario` de los viajes no tiene tipo consistente

**Qué pasa:** En la colección `viajes`, el campo `horario` a veces es un **Timestamp de Firestore** y a veces es un **string** (texto plano). La app tiene código para manejar ambos casos, pero puede mostrar fechas incorrectas o romper filtros de horario (mañana/tarde/noche).

**Qué hacer:** Estandarizar `horario` como **Timestamp de Firestore** en todos los documentos. Si hay viajes viejos con string, migrarlos.

---

### 7. Las reservas están guardadas en dos lugares distintos

**Qué pasa:** Las reservas de viajes aparecen guardadas tanto en:
- `reservas/{reservationId}` (colección raíz)
- `viajes/{tripId}/reservas/{reservationId}` (subcolección)

No está claro si son los mismos datos duplicados o dos flujos distintos. Esto puede causar que se muestren reservas inconsistentes o que se borren de un lado y no del otro.

**Qué hacer:** Confirmar cuál es la fuente de verdad y si la colección raíz `reservas/` todavía se usa o puede archivarse/eliminarse.

---

### 8. Los envíos también están en dos colecciones

Mismo problema que las reservas:
- `envios/{shipmentId}` (colección raíz — envíos públicos disponibles)
- `viajes/{tripId}/envios/{shipmentId}` (subcolección — envíos vinculados a un viaje)

**Qué hacer:** Confirmar si son entidades distintas (lo cual tiene sentido: uno es la solicitud pública, el otro es el envío ya asignado a un viaje) o si hay duplicación. Necesitamos saber el flujo exacto para no mostrar datos incorrectos.

---

## 🟢 MEJORAS — Para el mediano plazo

### 9. Reglas de seguridad de Firestore — revisión general

Las reglas actuales probablemente son muy permisivas (modo test) o muy restrictivas. A continuación el esquema que necesitamos:

```
usuarios/{uid}
  → leer: solo el propio usuario
  → escribir: solo el propio usuario
  → excepción: admins pueden leer todo

usuarios/{uid}/vehiculos/{vehicleId}
  → leer: cualquier usuario autenticado (se usan en búsqueda de viajes)
  → escribir: solo el dueño (uid == userId)

viajes/{tripId}
  → leer: cualquier usuario (incluso no autenticado está bien)
  → crear: cualquier usuario autenticado
  → actualizar/eliminar: solo si conductor.uid == usuario actual

viajes/{tripId}/reservas/{reservationId}
  → leer: el conductor del viaje O el pasajero que la creó
  → crear: cualquier usuario autenticado
  → eliminar: el pasajero dueño O el conductor

envios/{shipmentId}
  → leer: cualquier usuario autenticado (si estado == "publicado")
  → crear: cualquier usuario autenticado
  → actualizar/eliminar: solo si creadorId == usuario actual

verificaciones/{uid}
  → leer: el propio usuario O un admin
  → escribir: el propio usuario O un admin

Storage: perfil-fotos/{userId}
  → leer: cualquier autenticado
  → escribir: solo el dueño

Storage: verificaciones/{uid}/**
  → leer: admin solamente
  → escribir: el propio usuario
```

---

### 10. Nombres de timestamp inconsistentes

En distintos documentos los timestamps se llaman `createdAt`, `creado`, `actualizadoEn`, `updatedAt`. No bloquea nada hoy pero dificulta consultas y mantenimiento.

**Sugerencia:** Estandarizar a `createdAt` y `updatedAt` en todos los documentos nuevos. No es urgente migrar los viejos, pero sí evitar escribir nombres nuevos en español.

---

### 11. No hay limpieza de archivos en Storage al borrar documentos

Cuando se elimina un viaje, una verificación o un envío, los archivos asociados en Storage (fotos, documentos) quedan huérfanos. No es urgente, pero a largo plazo ocupa espacio innecesario.

**Sugerencia:** Implementar una Cloud Function que escuche `onDelete` en esas colecciones y limpie los archivos relacionados.

---

## REFERENCIA COMPLETA — Todos los campos por colección

### `usuarios/{uid}`

| Campo | Tipo | Descripción |
|---|---|---|
| `role` | string | `"conductor"` o `"viajero"` — **campo crítico** (actualmente `rol` en muchos docs, migrar a `role`) |
| `nombre` | string | Nombre completo |
| `email` | string | Email del usuario |
| `whatsapp` | string | Número de WhatsApp con formato libre |
| `fotoURL` | string | URL de foto de perfil en Storage |
| `descripcion` | string | Bio / descripción personal |
| `direccion` | string | Ciudad o barrio |
| `perfilVisible` | boolean | Si el conductor puede ver el perfil del pasajero |
| `viajesCompletados` | number | Contador de viajes terminados |
| `viajesPublicados` | number | Solo conductores — viajes publicados |
| `valoraciones` | object | `{conduccion, puntualidad, amabilidad, limpieza}` — valores numéricos |

### `usuarios/{uid}/vehiculos/{vehicleId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `marca` | string | Marca del vehículo |
| `modelo` | string | Modelo |
| `año` | number | Año |
| `color` | string | Color |
| `patente` | string | Patente |
| `fotos` | array de strings | URLs de fotos del vehículo |
| `verificado` | boolean | Si el vehículo fue verificado por un admin |

### `viajes/{tripId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `origen` | string | Ciudad/dirección de origen |
| `destino` | string | Ciudad/dirección de destino |
| `origenCoords` | object `{lat, lng}` | Coordenadas de origen |
| `destinoCoords` | object `{lat, lng}` | Coordenadas de destino |
| `fecha` | string | Fecha del viaje |
| `horario` | **Timestamp** | Hora de salida — *estandarizar como Timestamp* |
| `asientos` | number | Asientos disponibles |
| `conductor` | object | `{uid, nombre, whatsapp}` del conductor |
| `aceptaPaquetes` | boolean | Si acepta encomiendas |
| `pesoMax` | number | Peso máximo del paquete en kg |
| `volumenMax` | number | Volumen máximo en litros |
| `costoBasePaquete` | number | Costo base del envío en pesos |

### `viajes/{tripId}/reservas/{reservationId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `passengerUid` | string | UID del pasajero — *actualmente fragmentado en 4 nombres distintos, migrar a este* |
| `nombre` | string | Nombre del pasajero al momento de reservar |
| `whatsapp` | string | WhatsApp del pasajero |
| `fechaReserva` | Timestamp | Cuándo se hizo la reserva |
| `cantidadPasajeros` | number | Cantidad de asientos reservados |
| `estadoReserva` | string | `"pendiente"` por ahora |

### `envios/{shipmentId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `titulo` | string | Descripción del paquete |
| `origen` | string | Dirección de retiro |
| `destino` | string | Dirección de entrega |
| `precio` | number | Precio acordado |
| `precioSugerido` | number | Precio sugerido automáticamente |
| `fotos` | array de strings | Fotos del paquete |
| `creadorId` | string | UID del que publicó el envío |
| `estado` | string | `"publicado"` u otros estados |
| `pagoEstado` | string | Estado del pago |
| `createdAt` | Timestamp | Fecha de creación (actualmente mixto entre `creado`, `creadoEn`, `createdAt`) |

### `verificaciones/{uid}`

| Campo | Tipo | Descripción |
|---|---|---|
| `status` | string | `"incomplete"`, `"pending"`, `"verified"`, `"rejected"` |
| `nombreCompleto` | string | Nombre legal del conductor |
| `dniNumero` | string | Número de DNI |
| `dniFrenteURL` | string | Foto frente del DNI en Storage |
| `dniDorsoURL` | string | Foto dorso del DNI en Storage |
| `licenciaFrenteURL` | string | Frente de licencia |
| `licenciaDorsoURL` | string | Dorso de licencia |
| `selfieURL` | string | Selfie de verificación |
| `step` | number | Paso del wizard en que quedó |

---

## Rutas de Storage usadas por la app

| Ruta | Contenido | Quién lee | Quién escribe |
|---|---|---|---|
| `perfil-fotos/{userId}` | Foto de perfil | Cualquier autenticado | Solo el dueño |
| `verificaciones/{uid}/selfie/...` | Selfie de verificación | Solo admins | El propio usuario |
| `verificaciones/{uid}/{doc}/file` | DNI y licencia | Solo admins | El propio usuario |
| `envios/{uid}/{envioId}/{archivo}` | Fotos de paquetes | Autenticados | El creador |

---

## Endpoints del backend que el frontend consume

| Endpoint | Método | Para qué |
|---|---|---|
| `{BACKEND_URL}/create_preference` | POST | Crear preferencia de pago en MercadoPago para un viaje |
| `{BACKEND_URL}/api/envios/{id}/aceptar` | POST | Conductor acepta un envío e inicia el pago |

La URL base del backend tiene que estar en una variable de entorno. Avisarnos cuál es la URL del servidor para configurarla.
