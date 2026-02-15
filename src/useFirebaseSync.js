import { useState, useEffect, useCallback, useRef } from "react";
import { firebaseEnabled, auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, writeBatch } from "firebase/firestore";

const STORAGE_KEY = "arcadia-tracker-v2";
const PHOTO_KEY = "kensho-photos-v1";
const TZ_KEY = "kensho-timezone-v1";

/**
 * Firebase Auth + Firestore sync hook.
 *
 * localStorage is always the primary store (offline-first).
 * When signed in, Firestore is the cloud layer that syncs across devices.
 *
 * Firestore structure:
 *   users/{uid}/meta/config → { startDate, weeklyReviews, timezone, lastModified }
 *   users/{uid}/days/{date} → { ...dayData, lastModified }
 */
export default function useFirebaseSync() {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error
  const unsubRef = useRef(null);

  // ── Auth state listener ──
  useEffect(() => {
    if (!firebaseEnabled) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setSyncStatus("idle");
        // Unsubscribe from real-time listener when signed out
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
      }
    });
    return () => unsub();
  }, []);

  // ── Sign In ──
  const signIn = useCallback(async () => {
    if (!firebaseEnabled) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  }, []);

  // ── Sign Out ──
  const signOutUser = useCallback(async () => {
    if (!firebaseEnabled) return;
    try {
      await fbSignOut(auth);
      setUser(null);
      setSyncStatus("idle");
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  }, []);

  // ── Initial sync: merge localStorage ↔ Firestore ──
  const initialSync = useCallback(async () => {
    if (!firebaseEnabled || !auth.currentUser) return;
    setSyncStatus("syncing");
    try {
      const uid = auth.currentUser.uid;

      // 1. Read local data
      const localRaw = localStorage.getItem(STORAGE_KEY);
      const localData = localRaw ? JSON.parse(localRaw) : null;
      const localTz = localStorage.getItem(TZ_KEY) || "Asia/Manila";

      // 2. Read Firestore meta
      const metaRef = doc(db, "users", uid, "meta", "config");
      const metaSnap = await getDoc(metaRef);
      const remoteMeta = metaSnap.exists() ? metaSnap.data() : null;

      // 3. Read all Firestore days
      const daysCol = collection(db, "users", uid, "days");
      const daysSnap = await getDocs(daysCol);
      const remoteDays = {};
      daysSnap.forEach((d) => { remoteDays[d.id] = d.data(); });

      // 4. Merge — per-day last-write-wins
      const mergedDays = { ...(localData?.days || {}) };
      Object.entries(remoteDays).forEach(([date, remoteDay]) => {
        const localDay = mergedDays[date];
        if (!localDay) {
          mergedDays[date] = remoteDay;
        } else {
          // Last-write-wins per day
          const localMod = localDay.lastModified || 0;
          const remoteMod = remoteDay.lastModified || 0;
          if (remoteMod > localMod) {
            mergedDays[date] = remoteDay;
          }
        }
      });

      // Merge meta (startDate, weeklyReviews)
      const mergedMeta = {
        startDate: localData?.startDate || remoteMeta?.startDate || new Date().toISOString().split("T")[0],
        weeklyReviews: { ...(remoteMeta?.weeklyReviews || {}), ...(localData?.weeklyReviews || {}) },
        timezone: localTz,
        lastModified: Date.now(),
      };

      // 5. Save merged to localStorage
      const mergedData = { days: mergedDays, startDate: mergedMeta.startDate, weeklyReviews: mergedMeta.weeklyReviews };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));

      // 6. Push merged to Firestore
      const batch = writeBatch(db);
      batch.set(metaRef, mergedMeta, { merge: true });

      Object.entries(mergedDays).forEach(([date, dayData]) => {
        const dayRef = doc(db, "users", uid, "days", date);
        batch.set(dayRef, { ...dayData, lastModified: dayData.lastModified || Date.now() }, { merge: true });
      });

      await batch.commit();

      // 7. Dispatch event so App.jsx reloads from localStorage
      window.dispatchEvent(new CustomEvent("kensho-sync", { detail: { type: "initial" } }));
      setSyncStatus("synced");
    } catch (err) {
      console.error("Initial sync failed:", err);
      setSyncStatus("error");
    }
  }, []);

  // ── Real-time listener for cross-device updates ──
  const startRealtimeSync = useCallback(() => {
    if (!firebaseEnabled || !auth.currentUser || unsubRef.current) return;

    const uid = auth.currentUser.uid;
    const daysCol = collection(db, "users", uid, "days");

    unsubRef.current = onSnapshot(daysCol, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return; // Ignore local writes

      const localRaw = localStorage.getItem(STORAGE_KEY);
      const localData = localRaw ? JSON.parse(localRaw) : { days: {}, startDate: "", weeklyReviews: {} };
      let changed = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const date = change.doc.id;
          const remoteDay = change.doc.data();
          const localDay = localData.days[date];
          const localMod = localDay?.lastModified || 0;
          const remoteMod = remoteDay.lastModified || 0;

          if (remoteMod > localMod) {
            localData.days[date] = remoteDay;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
        window.dispatchEvent(new CustomEvent("kensho-sync", { detail: { type: "realtime" } }));
      }
    }, (err) => {
      console.error("Realtime sync error:", err);
    });
  }, []);

  // ── Push a single day to Firestore ──
  const pushDay = useCallback(async (date, dayData) => {
    if (!firebaseEnabled || !auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      const dayRef = doc(db, "users", uid, "days", date);
      await setDoc(dayRef, { ...dayData, lastModified: dayData.lastModified || Date.now() }, { merge: true });
    } catch (err) {
      console.error("Push day failed:", err);
    }
  }, []);

  // ── Push meta (startDate, weeklyReviews) to Firestore ──
  const pushMeta = useCallback(async (data) => {
    if (!firebaseEnabled || !auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      const metaRef = doc(db, "users", uid, "meta", "config");
      await setDoc(metaRef, {
        startDate: data.startDate,
        weeklyReviews: data.weeklyReviews || {},
        lastModified: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.error("Push meta failed:", err);
    }
  }, []);

  // ── Run initial sync + start real-time when user signs in ──
  useEffect(() => {
    if (user) {
      initialSync().then(() => startRealtimeSync());
    }
  }, [user, initialSync, startRealtimeSync]);

  return {
    firebaseEnabled,
    user,
    syncStatus,
    signIn,
    signOut: signOutUser,
    pushDay,
    pushMeta,
  };
}
