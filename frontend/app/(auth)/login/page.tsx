// app/(auth)/login/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const { sendOtp, verifyOtpLogin, loading, error, clearAuthError } =
    useAuth();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push("/admin");
    }
  }, [isAuthenticated, user, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!email.trim()) {
        toast.error("Email is required");
        return;
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      clearAuthError();
      const success = await sendOtp(email);
      if (success) {
        setStep("otp");
        setOtp("");
        setResendCooldown(60);
      }
    },
    [email, sendOtp, clearAuthError],
  );

  const handleVerifyOtp = useCallback(
    async (otpValue: string) => {
      if (otpValue.length !== 6) {
        toast.error("Please enter the complete 6-digit OTP");
        return;
      }

      clearAuthError();
      await verifyOtpLogin(email, otpValue);
    },
    [email, verifyOtpLogin, clearAuthError],
  );

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      handleVerifyOtp(value);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    clearAuthError();
    const success = await sendOtp(email);
    if (success) {
      setOtp("");
      setResendCooldown(60);
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtp("");
    clearAuthError();
  };

  // Don't render the form if already authenticated (prevent flash)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 border border-border animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Admin Login
        </h1>
        <p className="text-muted-foreground">
          {step === "email"
            ? "Enter your admin email to receive a login code"
            : `Enter the 6-digit code sent to ${email}`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) clearAuthError();
              }}
              placeholder="Enter your admin email"
              required
              className="animate-slide-in-left animate-delay-200"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full red-gradient animate-fade-in-up animate-delay-600"
            size="lg"
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-center animate-fade-in-up">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              disabled={loading}
            >
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

          <Button
            onClick={() => handleVerifyOtp(otp)}
            disabled={loading || otp.length !== 6}
            className="w-full red-gradient"
            size="lg"
          >
            {loading ? "Verifying..." : "Verify & Login"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleBack}
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
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend OTP"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
