"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * AuthInitializer component
 * Validates the stored authentication token on app initialization
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
      // Check if there's a token in localStorage
      const token = localStorage.getItem("authToken");

      // If token exists but user is not in state, validate with backend
      if (token && !user) {
        try {
          await fetchCurrentUser();
        } catch (error) {
          console.error("Auth initialization failed:", error);
          // Token might be invalid, clear it
          localStorage.removeItem("authToken");
        }
      }
    };

    initAuth();
  }, [fetchCurrentUser, user]);

  // This component doesn't render anything
  return null;
}
