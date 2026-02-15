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
  const [prevUid, setPrevUid] = useState(null);

  // ── Load profile on auth change ──
  useEffect(() => {
    const uid = firebaseUser?.uid ?? null;

    if (!firebaseUser) {
      // Not signed in — clear profile (sign-out or fresh load)
      if (prevUid) {
        // Was signed in before → explicit sign-out
        setProfile(null);
      }
      setPrevUid(null);
      setProfileLoaded(true);
      return;
    }

    setPrevUid(uid);

    (async () => {
      try {
        if (!firebaseEnabled) {
          const userKey = `kensho-profile-${uid}`;
          const local = localStorage.getItem(userKey);
          if (local) setProfile(JSON.parse(local));
          setProfileLoaded(true);
          return;
        }
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
          localStorage.setItem(`kensho-profile-${uid}`, JSON.stringify(data));
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
          localStorage.setItem(`kensho-profile-${uid}`, JSON.stringify(ckProfile));
          console.log("✅ KENSHO: Migrated CK profile to Firestore");
        } else {
          // Brand new user — needs onboarding
          setProfile(null);
        }
        setProfileLoaded(true);
      } catch (err) {
        console.error("Profile load failed:", err);
        // Fallback to localStorage (per-user key)
        try {
          const local = localStorage.getItem(`kensho-profile-${uid}`);
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

    if (firebaseUser) {
      const uid = firebaseUser.uid;
      localStorage.setItem(`kensho-profile-${uid}`, JSON.stringify(newProfile));

      if (firebaseEnabled) {
        try {
          const profileRef = doc(db, "users", uid, "meta", "profile");
          await setDoc(profileRef, newProfile, { merge: true });
        } catch (err) {
          console.error("Profile save to Firestore failed:", err);
        }
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
