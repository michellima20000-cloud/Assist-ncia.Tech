import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache, collection, getDocs } from "firebase/firestore";

// Read Firebase config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const fbConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = initializeApp(fbConfig);
const db = initializeFirestore(app, { localCache: memoryLocalCache() });

async function run() {
  const name = "users";
  const colRef = collection(db, name);
  const snapshot = await getDocs(colRef);
  console.log(`=== Collection: ${name} (${snapshot.docs.length} docs) ===`);
  snapshot.docs.forEach(doc => {
    console.log(`ID: ${doc.id} =>`, JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);
