// app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import { LoginRequest } from "@/types/auth";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });

  const { login, loading, error, clearAuthError } = useAuth();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const ROLE_ROUTES: Record<string, string> = {
        guide: "/dashboard/guide",
        admin: "/admin",
        manager: "/admin",
        user: "/dashboard/user",
        tourist: "/dashboard/user", // Backend uses 'tourist' role
      };
      const redirectPath = ROLE_ROUTES[user.role] ?? "/dashboard";
      router.push(redirectPath);
    }
  }, [isAuthenticated, user, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear errors when user starts typing
    if (error) {
      clearAuthError();
    }
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      toast.error("Email is required", { ariaLabel: "Email validation error" });
      return false;
    }

    if (!formData.password.trim()) {
      toast.error("Password is required", {
        ariaLabel: "Password validation error",
      });
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address", {
        ariaLabel: "Email format error",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    clearAuthError();

    await login(formData);
  };

  // Don't render the form if already authenticated (prevent flash)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 border border-border animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome Back
        </h1>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Email address
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            required
            className="animate-slide-in-left animate-delay-200"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            required
            className="animate-slide-in-right animate-delay-400"
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full red-gradient animate-fade-in-up animate-delay-600"
          size="lg"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-8 text-center animate-fade-in-up animate-delay-800">
        <p className="text-muted-foreground text-sm">
          Want to become a guide?{" "}
          <Link
            href="/register-guide"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
