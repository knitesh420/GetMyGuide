// app/(auth)/signin/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/animations/FloatingLabelInput";
import { useAuth } from "@/lib/hooks/useAuth";
import { RootState } from "@/lib/store";
import { EASE_OUT } from "@/lib/motion";

function SigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const infoMessage = searchParams.get("message");
  // A same-origin path to return to after signing in (e.g. the booking page
  // sends "?redirect=/register-tourist"). Ignored unless it's an internal path.
  const redirectParam = searchParams.get("redirect");
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : null;

  const { login, loading, error, clearAuthError } = useAuth();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(
        safeRedirect ??
          (user.role === "guide" ? "/dashboard/guide" : "/dashboard/user"),
      );
    }
  }, [isAuthenticated, user, router, safeRedirect]);

  useEffect(() => {
    if (infoMessage) toast.info(infoMessage);
  }, [infoMessage]);

  useEffect(() => {
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || !password) {
        toast.error("Email and password are required.");
        return;
      }
      clearAuthError();
      await login({ email: email.trim(), password }, safeRedirect ?? undefined);
    },
    [email, password, login, clearAuthError, safeRedirect],
  );

  if (isAuthenticated) return null;

  return (
    <motion.div
      className="bg-card rounded-xl shadow-lg p-6 border border-border"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome Back
        </h1>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FloatingLabelInput
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          required
        />

        <div className="space-y-1.5">
          <FloatingLabelInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <AnimatePresence>
          {error && /verify/i.test(error) && (
            <motion.p
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              Didn&apos;t verify your email?{" "}
              <Link
                href="/signup"
                className="text-primary font-semibold hover:underline"
              >
                Resend a code
              </Link>
            </motion.p>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={loading}
          className="w-full red-gradient"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary font-semibold hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </motion.div>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninContent />
    </Suspense>
  );
}
