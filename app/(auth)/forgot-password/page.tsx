// app/(auth)/forgot-password/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useAuth } from "@/lib/hooks/useAuth";
import { RootState } from "@/lib/store";

function validatePassword(password: string): string {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  return "";
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { sendForgotPasswordOtp, resetPasswordWithOtp, loading, clearAuthError } = useAuth();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(user.role === "guide" ? "/dashboard/guide" : "/dashboard/user");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!/\S+@\S+\.\S+/.test(email)) {
        toast.error("Please enter a valid email address.");
        return;
      }
      clearAuthError();
      const success = await sendForgotPasswordOtp(email.trim());
      if (success) {
        setStep("reset");
        setResendCooldown(60);
      }
    },
    [email, sendForgotPasswordOtp, clearAuthError],
  );

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    clearAuthError();
    const success = await sendForgotPasswordOtp(email.trim());
    if (success) setResendCooldown(60);
  };

  const handleReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (otp.length !== 6) {
        toast.error("Please enter the complete 6-digit code");
        return;
      }
      const passwordError = validatePassword(newPassword);
      if (passwordError) return toast.error(passwordError);
      if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");

      clearAuthError();
      await resetPasswordWithOtp(email.trim(), otp, newPassword);
    },
    [email, otp, newPassword, confirmPassword, resetPasswordWithOtp, clearAuthError],
  );

  if (isAuthenticated) return null;

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 border border-border animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
        <p className="text-muted-foreground">
          {step === "email"
            ? "Enter your registered email to receive a reset code"
            : `Enter the code sent to ${email} and choose a new password`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-6">
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
          <Button type="submit" disabled={loading} className="w-full red-gradient" size="lg">
            {loading ? "Sending code..." : "Send Reset Code"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/signin" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={loading}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full red-gradient"
            size="lg"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep("email")}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="text-primary hover:text-primary/80 transition-colors disabled:text-muted-foreground"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
