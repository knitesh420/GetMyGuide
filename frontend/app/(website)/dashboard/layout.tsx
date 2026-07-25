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
  "/dashboard/admin": ["admin"],
  "/dashboard/guide": ["guide"],
  "/dashboard/user": ["tourist"],
};

// Where to send a user who lands on a section they aren't allowed to see.
// Admins go to /dashboard/admin, not the legacy /admin panel — that page sits
// outside this layout and so renders none of the sidebar navigation.
const HOME_FOR_ROLE: Record<string, string> = {
  admin: "/dashboard/admin",
  guide: "/dashboard/guide",
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
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-background lg:h-[calc(100vh-4rem)]">
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
    // Not `h-screen`: the website layout renders a fixed h-14/lg:h-16 header
    // and offsets us by that much, so a full 100vh here overflows the viewport
    // and makes the page scroll — which slides this shell's own sticky header
    // up under that fixed navbar. Claim only the space actually left.
    <div className="relative flex h-[calc(100vh-3.5rem)] bg-gray-50/50 lg:h-[calc(100vh-4rem)]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user.role}
      />
      {/* The guide panel gets a wider, green scrollbar; the default one is
          near-invisible. It must live on the scrolling element, which is why
          it's keyed off role here rather than inside the guide subtree. */}
      <div
        className={`flex flex-1 flex-col overflow-y-auto ${
          user.role === "guide" ? "guide-scrollbar" : ""
        }`}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
        {/* `relative z-0` traps page content in its own stacking context, so a
            child that raises its z-index can never paint over the sticky
            header. The header stays at z-30 — below the mobile sidebar overlay
            at z-40, which still needs to cover it.

            `dashboard-main` is the scope hook for the responsive polish layer in
            globals.css (touch targets, form rhythm, overflow guards); every rule
            keyed off it is gated below lg, so the desktop layout is untouched. */}
        <main className="dashboard-main relative z-0 flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Admin only — the guide and tourist panels are deliberately plain here,
          and rely on the header's own `shadow-sm` to separate it from the page.
          One accent rule spanning both columns, sitting on the shared h-18
          (72px) baseline of the sidebar's brand block and the header — `top-18`
          must track that height, or the rule cuts across the row instead of
          underlining it. Drawn here as a single element rather than once per
          column, so the two halves cannot drift out of alignment. z-40 clears
          the sidebar (lg:z-30) and the header (z-30), and stays under the
          mobile nav drawer (z-70) and its overlay (z-60). */}
      {user.role === "admin" && (
        <div className="pointer-events-none absolute inset-x-0 top-18 z-40 h-[3px] bg-gradient-to-r from-teal-400 to-cyan-500" />
      )}
    </div>
  );
}
