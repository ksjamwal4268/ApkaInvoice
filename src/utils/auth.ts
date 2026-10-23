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
}

export type GoogleUser = AppUser;

// Google login function
export const signInWithGoogle = () => signInWithPopup(auth, provider);

// Google logout function
export const signOutUser = () => firebaseSignOut(auth);

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
  };
};

export const useGoogleAuth = useAuth;