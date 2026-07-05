// app/(auth)/verify-otp/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useAuth } from "@/lib/hooks/useAuth";
import { RootState } from "@/lib/store";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const { verifyRegistrationOtp, sendRegistrationOtp, loading, clearAuthError } = useAuth();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

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

  const handleVerify = useCallback(
    async (otpValue: string) => {
      if (otpValue.length !== 6) {
        toast.error("Please enter the complete 6-digit code");
        return;
      }
      clearAuthError();
      const result = await verifyRegistrationOtp(email, otpValue);
      if (result) {
        sessionStorage.removeItem("pendingRegistration");
      }
    },
    [email, verifyRegistrationOtp, clearAuthError],
  );

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      handleVerify(value);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    const stashed = sessionStorage.getItem("pendingRegistration");
    if (!stashed) {
      toast.error("Please use the sign-up form again to resend a code.");
      router.push("/signup");
      return;
    }

    clearAuthError();
    const success = await sendRegistrationOtp(JSON.parse(stashed));
    if (success) {
      setOtp("");
      setResendCooldown(60);
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 border border-border animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Verify Your Email</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit code sent to
        </p>
        <Input value={email} readOnly disabled className="mt-3 text-center" />
      </div>

      <div className="space-y-6">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={handleOtpChange} disabled={loading}>
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
          onClick={() => handleVerify(otp)}
          disabled={loading || otp.length !== 6}
          className="w-full red-gradient"
          size="lg"
        >
          {loading ? "Verifying..." : "Verify & Continue"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => router.push("/signup")}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Change details
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
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
