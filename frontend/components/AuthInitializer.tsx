"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * AuthInitializer component
 * Validates the httpOnly-cookie session with the backend on app initialization
 * Only runs once when the app loads
 */
export default function AuthInitializer() {
  const { fetchCurrentUser, isAuthenticated, user } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once on app initialization
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initAuth = async () => {
      // Auth is cookie-based (httpOnly), so there's nothing to check
      // client-side first — just ask the backend who, if anyone, is logged in.
      if (!user) {
        try {
          await fetchCurrentUser();
        } catch (error) {
          console.error("Auth initialization failed:", error);
        }
      }
    };

    initAuth();
  }, [fetchCurrentUser, user]);

  // This component doesn't render anything
  return null;
}
