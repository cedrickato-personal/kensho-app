import { useState, useEffect, useCallback } from "react";
import { firebaseEnabled, db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { CK_PROFILE, DEFAULT_PROFILE, PROFILE_KEY } from "../constants/defaults";
import { WORKOUT_TEMPLATES } from "../constants/workoutTemplates";

/**
 * Manages user profile (goals, milestones, workout program, etc.)
 * - Loads from Firestore on sign-in (falls back to localStorage)
 * - Auto-migrates CK's data (creates profile from hardcoded values)
 * - Returns null profile + needsOnboarding for brand-new users
 */
export default function useUserProfile(firebaseUser) {
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // ── Load profile on auth change ──
  useEffect(() => {
    if (!firebaseUser) {
      // Not signed in — try localStorage fallback (for Electron offline)
      try {
        const local = localStorage.getItem(PROFILE_KEY);
        if (local) setProfile(JSON.parse(local));
      } catch {}
      setProfileLoaded(true);
      return;
    }

    (async () => {
      try {
        if (!firebaseEnabled) {
          const local = localStorage.getItem(PROFILE_KEY);
          if (local) setProfile(JSON.parse(local));
          setProfileLoaded(true);
          return;
        }

        const uid = firebaseUser.uid;
        const profileRef = doc(db, "users", uid, "meta", "profile");
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          // Profile exists — use it
          const data = profileSnap.data();
          // Ensure workoutProgram is resolved from template if missing
          if (!data.workoutProgram && data.workoutTemplateId) {
            const tpl = WORKOUT_TEMPLATES[data.workoutTemplateId];
            if (tpl) data.workoutProgram = tpl.program;
          }
          setProfile(data);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
          setProfileLoaded(true);
          return;
        }

        // No profile — check if this user has existing day data (CK migration)
        const daysCol = collection(db, "users", uid, "days");
        const daysSnap = await getDocs(daysCol);

        if (daysSnap.size > 0) {
          // Has data but no profile → CK migration
          const ckProfile = {
            ...CK_PROFILE,
            workoutProgram: WORKOUT_TEMPLATES["coach-mike-2day"].program,
            createdAt: Date.now(),
            lastModified: Date.now(),
          };
          await setDoc(profileRef, ckProfile);
          setProfile(ckProfile);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(ckProfile));
          console.log("✅ KENSHO: Migrated CK profile to Firestore");
        } else {
          // Brand new user — needs onboarding
          setProfile(null);
        }
        setProfileLoaded(true);
      } catch (err) {
        console.error("Profile load failed:", err);
        // Fallback to localStorage
        try {
          const local = localStorage.getItem(PROFILE_KEY);
          if (local) setProfile(JSON.parse(local));
        } catch {}
        setProfileLoaded(true);
      }
    })();
  }, [firebaseUser]);

  // ── Save profile ──
  const saveProfile = useCallback(async (updates) => {
    const newProfile = { ...(profile || DEFAULT_PROFILE), ...updates, lastModified: Date.now() };
    setProfile(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));

    if (firebaseEnabled && firebaseUser) {
      try {
        const uid = firebaseUser.uid;
        const profileRef = doc(db, "users", uid, "meta", "profile");
        await setDoc(profileRef, newProfile, { merge: true });
      } catch (err) {
        console.error("Profile save to Firestore failed:", err);
      }
    }
  }, [profile, firebaseUser]);

  return {
    profile,
    profileLoaded,
    saveProfile,
    needsOnboarding: profileLoaded && !profile,
  };
}
