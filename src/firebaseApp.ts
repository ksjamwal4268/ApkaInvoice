import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, disableNetwork, enableNetwork } from "firebase/firestore";
import firebaseConfig from "./firebase.config";

// Initialize Firebase services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Probe whether Firestore is blocked by client ad blocker / privacy extension
let cloudAvailable = true;

export function isCloudAvailable(): boolean {
  return cloudAvailable;
}

export function markCloudBlocked(): void {
  if (!cloudAvailable) return;
  cloudAvailable = false;
  try {
    localStorage.setItem("cc_firestore_blocked", "true");
    disableNetwork(db).catch(() => {});
  } catch {}
}

if (typeof window !== "undefined") {
  // If previously detected as blocked by client, disable immediately without waiting
  if (localStorage.getItem("cc_firestore_blocked") === "true") {
    cloudAvailable = false;
    disableNetwork(db).catch(() => {});
  }

  // Probe Firestore endpoint silently to check if ad blocker / browser shield is active
  fetch("https://firestore.googleapis.com", {
    method: "HEAD",
    mode: "no-cors",
    cache: "no-store",
  })
    .then(() => {
      // Reachable: re-enable network if it was temporarily disabled
      if (!cloudAvailable) {
        cloudAvailable = true;
        localStorage.removeItem("cc_firestore_blocked");
        enableNetwork(db).catch(() => {});
      }
    })
    .catch(() => {
      // Intercepted by ad blocker / browser shield: immediately halt all Firestore channel attempts
      markCloudBlocked();
    });
}
