import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Read config from env vars (set in .env for local, Vercel env for production)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only init Firebase if config is present (Electron builds without .env skip this)
export const firebaseEnabled = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();

  // Enable offline persistence for Firestore
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore persistence: multiple tabs open, only works in one");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore persistence: not supported in this browser");
    }
  });
}

export { auth, db, googleProvider };
