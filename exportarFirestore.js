// exportarFirestore.js
const fs = require("fs");
const admin = require("firebase-admin");

// Cargá el archivo de clave privada de tu proyecto (descargalo desde Firebase Console)
const serviceAccount = require("./clave-firebase.json"); // Renombralo con el nombre correcto

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function exportarColeccion(nombreColeccion) {
  const coleccionRef = db.collection(nombreColeccion);
  const snapshot = await coleccionRef.get();

  const datos = {};
  for (const doc of snapshot.docs) {
    datos[doc.id] = doc.data();

    // Subcolecciones si querés
    const subcolecciones = await doc.ref.listCollections();
    for (const sub of subcolecciones) {
      const subSnap = await sub.get();
      datos[doc.id][sub.id] = {};
      subSnap.forEach((subDoc) => {
        datos[doc.id][sub.id][subDoc.id] = subDoc.data();
      });
    }
  }

  fs.writeFileSync(`${nombreColeccion}.json`, JSON.stringify(datos, null, 2));
  console.log(`✅ Exportado ${nombreColeccion}.json`);
}

// Lista de colecciones a exportar
const colecciones = ["usuarios", "viajes"];

(async () => {
  for (const col of colecciones) {
    await exportarColeccion(col);
  }
})();
