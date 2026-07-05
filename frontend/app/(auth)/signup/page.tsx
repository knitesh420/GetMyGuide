// app/(auth)/signup/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/useAuth";
import { RootState } from "@/lib/store";
import Link from "next/link";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "USA/Canada (+1)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+86", label: "China (+86)" },
];

function validatePassword(password: string): string {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  return "";
}

export default function SignupPage() {
  const router = useRouter();
  const { sendRegistrationOtp, loading, clearAuthError } = useAuth();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"tourist" | "guide">("tourist");

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) return toast.error("Full name is required.");
      if (!/\S+@\S+\.\S+/.test(email)) return toast.error("Please enter a valid email address.");
      if (!phone.trim() || phone.trim().length < 6) return toast.error("Please enter a valid phone number.");
      const passwordError = validatePassword(password);
      if (passwordError) return toast.error(passwordError);
      if (password !== confirmPassword) return toast.error("Passwords do not match.");

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        countryCode,
        password,
        confirmPassword,
        accountType,
      };
      const success = await sendRegistrationOtp(payload);

      if (success) {
        // Stashed only in sessionStorage (tab-scoped, never in a URL/query
        // string) so the verify-otp page can resend without asking the user
        // to retype their password. Cleared once verification succeeds.
        sessionStorage.setItem("pendingRegistration", JSON.stringify(payload));
        router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }
    },
    [name, email, phone, countryCode, password, confirmPassword, accountType, sendRegistrationOtp, router],
  );

  if (isAuthenticated) return null;

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 border border-border animate-scale-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
        <p className="text-muted-foreground">Join as a tourist or a guide</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>I am a</Label>
          <RadioGroup
            value={accountType}
            onValueChange={(v) => setAccountType(v as "tourist" | "guide")}
            className="grid grid-cols-2 gap-3"
          >
            <label
              className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                accountType === "tourist" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="tourist" />
              <span className="text-sm font-medium">Tourist</span>
            </label>
            <label
              className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                accountType === "guide" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="guide" />
              <span className="text-sm font-medium">Guide</span>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            disabled={loading}
            required
          />
        </div>

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
          <Label htmlFor="phone">Phone Number</Label>
          <div className="flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-32.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Phone number"
              disabled={loading}
              required
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            disabled={loading}
            required
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full red-gradient" size="lg">
          {loading ? "Sending code..." : "Create Account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
