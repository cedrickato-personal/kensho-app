import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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

  // Firebase v10+ persistence: use initializeFirestore with persistent cache
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (err) {
    // If persistence fails (e.g. already initialized), fall back to basic Firestore
    console.warn("Firestore persistent cache failed, using default:", err.message);
    db = getFirestore(app);
  }

  googleProvider = new GoogleAuthProvider();
}

export { auth, db, googleProvider };
