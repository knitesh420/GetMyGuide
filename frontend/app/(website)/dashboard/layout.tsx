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
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // isAuthenticated starts out `null` (unknown) until the app-wide
    // AuthInitializer's cookie-based session check resolves — only redirect
    // once we actually know the visitor isn't logged in.
    if (isAuthenticated === false) {
      router.push("/signin?message=Please login to access this page");
    }
  }, [isAuthenticated, router]);

  // Still resolving the session (or a session-affecting request is in
  // flight) — show a loader instead of flashing content or redirecting
  // prematurely.
  if (isAuthenticated === null || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated — the redirect above will fire; render nothing meanwhile.
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
