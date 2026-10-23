import { useState, useEffect, useCallback } from "react";

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder-google-client-id.apps.googleusercontent.com";

export function useGoogleAuth() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("cc-google-user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith("placeholder")) {
      console.warn("Google Client ID not configured. Add it to .env file.");
      return;
    }

    try {
      // Use Google OAuth with client ID
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.append("client_id", GOOGLE_CLIENT_ID);
      url.searchParams.append("redirect_uri", window.location.origin + "/auth/callback");
      url.searchParams.append("response_type", "token");
      url.searchParams.append("scope", "openid email profile");
      url.searchParams.append("access_type", "offline");
      url.searchParams.append("include_granted_scopes", "true");
      url.searchParams.append("state", "cash-copilot");

      // Open Google OAuth flow
      const popupWidth = 600;
      const popupHeight = 600;
      const left = (screen.width - popupWidth) / 2;
      const top = (screen.height - popupHeight) / 2;

      const popup = window.open(
        url.toString(),
        "GoogleAuth",
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},menubar=no,toolbar=no,status=no`
      );

      if (!popup) {
        alert("Please allow popups for this site");
        return;
      }

      // Listen for message from the popup with the auth result
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "google-auth-success") {
          setUser(event.data.user);
          localStorage.setItem("cc-google-user", JSON.stringify(event.data.user));
          popup.close();
        }
        if (event.data?.type === "google-auth-error") {
          alert(event.data.message);
          popup.close();
        }
      };

      window.addEventListener("message", messageHandler);

      // cleanup
      return () => {
        window.removeEventListener("message", messageHandler);
      };
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem("cc-google-user");
  }, []);

  return { user, isLoading, signIn, signOut };
}