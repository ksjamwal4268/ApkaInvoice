import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { app, auth, db, googleProvider } from "../firebaseApp";
import { getStoredBusinessProfile, saveBusinessProfile, syncUserDataFromCloud } from "../data/dataStore";

export { app, auth, db };

export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  phone?: string;
}

export type GoogleUser = AppUser;

// Google login function with automatic fallback to redirect if popup is blocked
export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    console.warn("signInWithPopup error:", err);
    if (
      err?.code === "auth/popup-blocked" ||
      err?.code === "auth/cancelled-popup-request" ||
      err?.code === "auth/internal-error"
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectErr) {
        console.error("signInWithRedirect error:", redirectErr);
        throw redirectErr;
      }
    }
    throw err;
  }
};

// Google logout function
export const signOutUser = () => firebaseSignOut(auth);

// Helper to update current stored user
export const updateStoredUser = (updates: Partial<AppUser>) => {
  try {
    const stored = localStorage.getItem("cc-google-user");
    const current = stored ? JSON.parse(stored) : { id: "local-user", name: "User", email: "" };
    const merged = { ...current, ...updates };
    localStorage.setItem("cc-google-user", JSON.stringify(merged));
    window.dispatchEvent(new Event("cc-auth-updated"));
    return merged;
  } catch (e) {
    console.warn("Failed to update stored user:", e);
    return null;
  }
};

// Subscribe to auth state changes (for Welcome.tsx and components)
export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem("cc-google-user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthUpdated = () => {
      const stored = localStorage.getItem("cc-google-user");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("cc-auth-updated", handleAuthUpdated);
    window.addEventListener("storage", handleAuthUpdated);
    return () => {
      window.removeEventListener("cc-auth-updated", handleAuthUpdated);
      window.removeEventListener("storage", handleAuthUpdated);
    };
  }, []);

  useEffect(() => {
    // Process redirect result if browser was redirected for auth
    getRedirectResult(auth).catch((err) => {
      console.warn("getRedirectResult notice:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const appUser: AppUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "",
          email: firebaseUser.email || "",
          picture: firebaseUser.photoURL || undefined,
        };
        setUser(appUser);
        localStorage.setItem("cc-google-user", JSON.stringify(appUser));
        window.dispatchEvent(new Event("cc-auth-updated"));
        window.dispatchEvent(new Event("cc-store-updated"));

        // Pull user's synced data from Firestore in the background (non-blocking for fast startup)
        syncUserDataFromCloud(firebaseUser.uid)
          .then(() => {
            window.dispatchEvent(new Event("cc-store-updated"));
          })
          .catch((err) => {
            console.warn("Cloud sync notice (offline fallback):", err);
          });

        // Initialize default profile fields for this user if missing, preserving phone and email for returning users
        try {
          const currentProf = getStoredBusinessProfile();
          let needsUpdate = false;
          const nextProf = { ...currentProf };
          if (!nextProf.contactPerson && appUser.name) {
            nextProf.contactPerson = appUser.name;
            needsUpdate = true;
          }
          if (!nextProf.email && appUser.email) {
            nextProf.email = appUser.email;
            needsUpdate = true;
          }
          if (nextProf.phone && !appUser.phone) {
            appUser.phone = nextProf.phone;
            localStorage.setItem("cc-google-user", JSON.stringify(appUser));
          }
          if (nextProf.phone && nextProf.email && !nextProf.isOnboarded) {
            nextProf.isOnboarded = true;
            needsUpdate = true;
          }
          if (needsUpdate) {
            saveBusinessProfile(nextProf);
          }
        } catch (err) {
          console.warn("Auto-sync profile on login notice:", err);
        }
      } else {
        localStorage.removeItem("cc-google-user");
        setUser(null);
        window.dispatchEvent(new Event("cc-auth-updated"));
        window.dispatchEvent(new Event("cc-store-updated"));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Sign out error:", e);
    }
    localStorage.removeItem("cc-google-user");
    setUser(null);
    window.dispatchEvent(new Event("cc-auth-updated"));
    window.dispatchEvent(new Event("cc-store-updated"));
  };

  return {
    user,
    loading,
    isLoading: loading,
    signInWithGoogle,
    signIn: signInWithGoogle,
    signOutUser: handleSignOut,
    signOut: handleSignOut,
    updateUser: updateStoredUser,
  };
};

export const useGoogleAuth = useAuth;