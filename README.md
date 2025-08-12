# ⚠️ Clean-up Ongoing! Expect issues ⚠️
---
# 🚗 Viajes Compartidos

Plataforma colaborativa para compartir viajes entre personas. Inspirado en BlaBlaCar, esta app permite a los usuarios ofrecer y encontrar viajes cercanos.

## Funcionalidades (MVP)
- Inicio de sesión con Google
- Ver viajes disponibles
- Publicar un nuevo viaje

## Tecnologías
- React
- Firebase Auth + Firestore
- TailwindCSS

## Instalación
```bash
npm install
npm start 

SUBIR A LA NUBE
Login en Firebase (si no lo habías hecho ya):

firebase login
Inicializar Hosting (solo la primera vez):

firebase init hosting

Elegís tu proyecto de Firebase

Le indicás que la carpeta de public sea build

Respondés “yes” a la opción de SPA (rewrites a index.html)

Generar el build (desde la raíz del proyecto React):

npm run build

firebase deploy --only hosting

/////¿Qué hace cada uno?
npm run build: genera la carpeta build/ con los archivos optimizados.

firebase deploy: sube esa carpeta build/ al servidor de Firebase./////

LISTO SE SUBRE A LA NUBE MEVOY.AR

![screenshot](MeVoy/src/assets/logo_mevoy_nobg_dark.png)