"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/dashboard/Sidebar";
import Header from "@/components/layout/dashboard/Header";
import { useAuth } from "@/lib/hooks/useAuth";

// Which roles may access each dashboard section. The backend already enforces
// RBAC on every API call; this is a UX guard so users don't land on a shell
// they have no access to (and fire a wall of 403s).
const SECTION_ROLES: Record<string, string[]> = {
  "/dashboard/admin": ["admin", "manager"],
  "/dashboard/guide": ["guide"],
  "/dashboard/user": ["user", "tourist"],
};

// Where to send a user who lands on a section they aren't allowed to see.
const HOME_FOR_ROLE: Record<string, string> = {
  admin: "/admin",
  manager: "/admin",
  guide: "/dashboard/guide",
  user: "/dashboard/user",
  tourist: "/dashboard/user",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Find the section the current path belongs to (if any) and whether this
  // user's role is permitted there.
  const requiredRoles = Object.entries(SECTION_ROLES).find(([prefix]) =>
    pathname?.startsWith(prefix)
  )?.[1];
  const isRoleAllowed =
    !requiredRoles || (user?.role ? requiredRoles.includes(user.role) : false);

  useEffect(() => {
    // isAuthenticated starts out `null` (unknown) until the app-wide
    // AuthInitializer's cookie-based session check resolves — only redirect
    // once we actually know the visitor isn't logged in.
    if (isAuthenticated === false) {
      router.push("/signin?message=Please login to access this page");
      return;
    }

    // Authenticated, but on a section their role can't access — send them to
    // their own dashboard home instead of rendering the wrong shell.
    if (isAuthenticated && user && !isRoleAllowed) {
      router.replace(HOME_FOR_ROLE[user.role] ?? "/dashboard/user");
    }
  }, [isAuthenticated, user, isRoleAllowed, router]);

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

  // Not authenticated, or authenticated but not permitted on this section —
  // the redirect above will fire; render nothing meanwhile.
  if (!isAuthenticated || !user || !isRoleAllowed) {
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
