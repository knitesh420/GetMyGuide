// app/(auth)/signin/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/useAuth";
import { RootState } from "@/lib/store";

function SigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const infoMessage = searchParams.get("message");

  const { login, loading, error, clearAuthError } = useAuth();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(
        user.role === "guide" ? "/dashboard/guide" : "/dashboard/user",
      );
    }
  }, [isAuthenticated, user, router]);

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
      await login({ email: email.trim(), password });
    },
    [email, password, login, clearAuthError],
  );

  if (isAuthenticated) return null;

  return (
    <div className="bg-card rounded-xl shadow-lg p-6 border border-border animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome Back
        </h1>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            disabled={loading}
            required
          />
        </div>

        {error && /verify/i.test(error) && (
          <p className="text-xs text-muted-foreground">
            Didn&apos;t verify your email?{" "}
            <Link
              href="/signup"
              className="text-primary font-semibold hover:underline"
            >
              Resend a code
            </Link>
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full red-gradient"
          size="lg"
        >
          {loading ? "Signing in..." : "Sign In"}
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
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninContent />
    </Suspense>
  );
}
