import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache, collection, getDocs, Timestamp } from "firebase/firestore";

// Read Firebase config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const fbConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = initializeApp(fbConfig);
const db = initializeFirestore(app, { localCache: memoryLocalCache() });

function convertFromFirestore(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (obj && typeof obj.toDate === "function") {
    return obj.toDate().toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertFromFirestore(item));
  }
  
  if (typeof obj === "object") {
    // Check both underscores and no underscores
    if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
      return new Date(obj._seconds * 1000).toISOString();
    }
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
      return new Date(obj.seconds * 1000).toISOString();
    }
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertFromFirestore(obj[key]);
    }
    return result;
  }
  
  return obj;
}

async function run() {
  const colRef = collection(db, "pagamentos");
  const snapshot = await getDocs(colRef);
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const converted = convertFromFirestore(data);
    console.log(`Doc: ${docSnap.id}`);
    console.log(`  Raw date type: ${typeof data.date} (${data.date ? data.date.constructor.name : 'null'})`);
    console.log(`  Converted date:`, converted.date);
  });
}

run().catch(console.error).then(() => process.exit(0));
