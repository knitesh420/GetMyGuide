"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type Role = "tourist" | "guide" | "admin";

interface RoleGuardProps {
  children: React.ReactNode;
  /** Roles permitted to view the page. */
  allowRoles: Role[];
  /**
   * When true, anonymous visitors are sent to sign in. When false (default),
   * anonymous visitors may view the page — used for pages that also serve
   * guests, e.g. the guest booking form.
   */
  requireAuth?: boolean;
  /** Where to send a signed-in user whose role isn't allowed. */
  redirectTo: string;
}

/**
 * Client-side role gate. This is UX only — the backend is the authoritative
 * enforcement point. It keeps a tourist out of the guide-registration page and
 * a guide out of the tourist booking page, showing an "Unauthorized Access"
 * message while it redirects them to their own dashboard.
 */
export default function RoleGuard({
  children,
  allowRoles,
  requireAuth = false,
  redirectTo,
}: RoleGuardProps) {
  const { user, isAuthenticated, fetchCurrentUser } = useAuth();
  const router = useRouter();

  // isAuthenticated is null until the session has been resolved; treat that as
  // pending so we neither flash the page nor redirect prematurely.
  const pending = isAuthenticated === null;
  const isAnonymous = isAuthenticated === false || !user;
  const roleAllowed = !isAnonymous && allowRoles.includes(user!.role as Role);
  const blockedForAuth = requireAuth && isAnonymous;
  const blockedForRole = !isAnonymous && !roleAllowed;

  useEffect(() => {
    if (isAuthenticated === null) fetchCurrentUser();
  }, [isAuthenticated, fetchCurrentUser]);

  useEffect(() => {
    if (pending) return;
    if (blockedForAuth) {
      router.replace("/signin");
    } else if (blockedForRole) {
      router.replace(redirectTo);
    }
  }, [pending, blockedForAuth, blockedForRole, redirectTo, router]);

  if (pending) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blockedForAuth || blockedForRole) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="max-w-md text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="mt-2 text-muted-foreground">
            This page isn&apos;t available for your account type. Redirecting
            you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
