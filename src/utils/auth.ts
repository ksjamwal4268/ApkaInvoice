import { useState, useEffect } from "react";
import {
  signInWithPopup,
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

// Google login function
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

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

        // Pull user's synced data from Firestore (for cross-device sync)
        try {
          await syncUserDataFromCloud(firebaseUser.uid);
        } catch (err) {
          console.warn("Cloud sync warning:", err);
        }

        // Initialize default profile fields for this user if missing
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