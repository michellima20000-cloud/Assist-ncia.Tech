import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Initialize Firestore
const dbId = firebaseConfig.firestoreDatabaseId;
export const db = (dbId && dbId !== "(default)") 
  ? initializeFirestore(app, { localCache: memoryLocalCache() }, dbId) 
  : initializeFirestore(app, { localCache: memoryLocalCache() });

export default app;
