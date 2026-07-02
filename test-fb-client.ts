import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

async function run() {
  try {
    const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
    console.log("Config:", config);
    
    const app = initializeApp(config);
    const db = getFirestore(app, config.firestoreDatabaseId);
    console.log("Client SDK initialized. Attempting read...");
    
    const colRef = collection(db, "users");
    const q = query(colRef, limit(1));
    const snapshot = await getDocs(q);
    console.log("Read success! Documents found:", snapshot.size);
    snapshot.forEach(doc => {
      console.log("Doc:", doc.id, doc.data());
    });
  } catch (error) {
    console.error("Test failed:", error);
  }
}

run();
