// scripts/setAdmin.cjs  (CommonJS)
const fs = require("fs");
const admin = require("firebase-admin");

// ⚠️ Ajustá si tu key está en otra ruta
const KEY_PATH = "./serviceAccountKey.json";
if (!fs.existsSync(KEY_PATH)) {
  console.error("❌ No encuentro serviceAccountKey.json en la raíz del proyecto.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(KEY_PATH, "utf8")))
});

const uid = process.argv[2];
if (!uid) {
  console.error("Uso: npm run set:admin -- <UID>");
  process.exit(1);
}

(async () => {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    const user = await admin.auth().getUser(uid);
    console.log(`✅ Listo: ${uid} ahora es admin. Email: ${user.email || "(sin email)"}`);
    process.exit(0);
  } catch (e) {
    console.error("❌ Error seteando claim:", e);
    process.exit(1);
  }
})();
