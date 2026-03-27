// components/auth/AuthProvider.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { getCurrentUser } from "@/lib/redux/authSlice";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  );
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);

  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/about",
    "/contact",
  ];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/public")
  );

  useEffect(() => {
    if (
      !initialized &&
      !loading &&
      !isAuthenticated &&
      !pathname.includes("/login") &&
      !pathname.includes("/register")
    ) {
      dispatch(getCurrentUser()).finally(() => {
        setInitialized(true);
      });-
    } else if (!initialized) {
      setInitialized(true);
    }
  }, [dispatch, initialized, loading, isAuthenticated, pathname]);

  if (!initialized && !isPublicRoute && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
};
