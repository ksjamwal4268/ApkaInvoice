import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import firebaseConfig from "../firebase.config";
import { getStoredBusinessProfile, saveBusinessProfile } from "../data/dataStore";

// Initialize Firebase App & Auth
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google provider setup
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  phone?: string;
}

export type GoogleUser = AppUser;

// Google login function
export const signInWithGoogle = () => signInWithPopup(auth, provider);

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        const appUser: AppUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "Google User",
          email: firebaseUser.email || "",
          picture: firebaseUser.photoURL || undefined,
        };
        setUser(appUser);
        localStorage.setItem("cc-google-user", JSON.stringify(appUser));

        // Sync with stored business profile
        try {
          const currentProf = getStoredBusinessProfile();
          let needsUpdate = false;
          const nextProf = { ...currentProf };
          if (!nextProf.contactPerson || nextProf.contactPerson === "Rohit Sharma") {
            if (appUser.name && appUser.name !== "Google User") {
              nextProf.contactPerson = appUser.name;
              needsUpdate = true;
            }
          }
          if (!nextProf.email || nextProf.email === "billing@sharmapackaging.in") {
            if (appUser.email) {
              nextProf.email = appUser.email;
              needsUpdate = true;
            }
          }
          if (needsUpdate) {
            saveBusinessProfile(nextProf);
          }
        } catch (err) {
          console.warn("Auto-sync profile on login notice:", err);
        }
      } else {
        const stored = localStorage.getItem("cc-google-user");
        if (!stored) {
          setUser(null);
        }
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