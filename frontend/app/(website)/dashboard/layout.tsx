"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/dashboard/Sidebar";
import Header from "@/components/layout/dashboard/Header";
import { useAuth } from "@/lib/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, loading, fetchCurrentUser } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    const verifyAuth = async () => {
      // Check if token exists in localStorage
      const token = localStorage.getItem("authToken");

      if (!token) {
        // No token, redirect to login immediately
        setIsVerifying(false);
        router.push("/login?message=Please login to access this page");
        return;
      }

      // Token exists, fetch current user only if we don't have user data
      if (!user) {
        try {
          await fetchCurrentUser();
        } catch (error) {
          console.error("Failed to fetch user:", error);
        }
      }

      setIsVerifying(false);
    };

    verifyAuth();
  }, [fetchCurrentUser, router, user]);

  useEffect(() => {
    // Redirect if not authenticated after verification
    if (!isVerifying && !loading && isAuthenticated === false) {
      router.push("/login?message=Please login to access this page");
    }
  }, [isAuthenticated, isVerifying, loading, router]);

  // Show loader while verifying or loading
  if (isVerifying || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user.role}
      />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
