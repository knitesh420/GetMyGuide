"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { AppDispatch } from "@/lib/store";
import {
  sendRegistrationOtp as sendRegistrationOtpThunk,
  verifyRegistrationOtp as verifyRegistrationOtpThunk,
} from "@/lib/redux/authSlice";
import { useAuth } from "@/lib/hooks/useAuth";
import RoleGuard from "@/components/auth/RoleGuard";
import { validateUpload } from "@/lib/fileUpload";
import {
  GUIDE_MEMBERSHIP_DAYS,
  GUIDE_MEMBERSHIP_FEE,
  GUIDE_TRIAL_DAYS,
} from "@/lib/guideMembership";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { FileUploadCard } from "@/components/FileUploadCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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

const PENDING_EMAIL_KEY = "guideRegistrationPendingEmail";

function subscribeToPendingRegistration(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("guide-registration-pending-change", callback);
  return () => window.removeEventListener("guide-registration-pending-change", callback);
}

function getPendingRegistrationEmail() {
  return typeof window === "undefined"
    ? ""
    : sessionStorage.getItem(PENDING_EMAIL_KEY) || "";
}

function setPendingRegistrationEmail(email: string | null) {
  if (email) sessionStorage.setItem(PENDING_EMAIL_KEY, email);
  else sessionStorage.removeItem(PENDING_EMAIL_KEY);
  window.dispatchEvent(new Event("guide-registration-pending-change"));
}

const LANGUAGE_OPTIONS: Option[] = [
  "English",
  "Spanish",
  "French",
  "Japanese",
  "Russian",
  "Chinese",
  "German",
  "Italian",
  "Portuguese",
  "Thai",
  "Arabic",
  "Other",
].map((l) => ({ value: l, label: l }));

/** Titled band inside the panel, ruled off from the one above it. */
const FormSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="border-b border-slate-200 px-6 py-6 last:border-b-0">
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
    {children}
  </section>
);

function BecomeGuidePage() {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const pendingEmail = useSyncExternalStore(
    subscribeToPendingRegistration,
    getPendingRegistrationEmail,
    () => "",
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const otpSent = !!pendingEmail;
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [pan, setPan] = useState("");
  const [guideType, setGuideType] = useState<"" | "normal" | "escort">("");
  const [languages, setLanguages] = useState<string[]>([]);

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    router.replace(user.role === "admin" ? "/dashboard/admin" : "/dashboard/guide");
  }, [isAuthenticated, router, user]);

  const guideProfileReady =
    !!city.trim() &&
    !!guideType &&
    languages.length > 0 &&
    (guideType !== "escort" || !!pan.trim()) &&
    !!profileFile &&
    !!licenceFile &&
    !!aadhaarFile &&
    disclaimerAccepted;
  const phoneError =
    phone.length > 0 && phone.length !== 10
      ? "Phone number must be exactly 10 digits."
      : "";

  const sendVerificationCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim()) return setFormError("Full name is required.");
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      return setFormError("Please enter a valid email address.");
    }
    if (phone.length !== 10) return;
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return setFormError("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
    }
    if (password !== confirmPassword) return setFormError("Passwords do not match.");
    if (!city.trim()) return setFormError("City is required.");
    if (!guideType) return setFormError("Please select a guide type.");
    if (guideType === "escort" && !pan.trim()) return setFormError("PAN is required for escort guides.");
    if (languages.length === 0) return setFormError("Please select at least one language.");
    if (!profileFile) return setFormError("A profile photo is required to register.");
    if (!licenceFile) return setFormError("Your guide licence is required to register.");
    if (!aadhaarFile) return setFormError("Your Aadhaar document is required to register.");
    const profileError = validateUpload(profileFile, "image");
    const licenceError = validateUpload(licenceFile, "document");
    const aadhaarError = validateUpload(aadhaarFile, "document");
    if (profileError || licenceError || aadhaarError) {
      return setFormError(profileError || licenceError || aadhaarError || "Invalid upload.");
    }
    if (!disclaimerAccepted) return setFormError("Please accept the disclaimer to proceed.");

    setSubmitting(true);
    const submission = new FormData();
    submission.append("name", name.trim());
    submission.append("email", normalizedEmail);
    submission.append("phone", phone);
    submission.append("countryCode", countryCode);
    submission.append("password", password);
    submission.append("confirmPassword", confirmPassword);
    submission.append("accountType", "guide");
    submission.append("city", city.trim());
    submission.append("type", guideType);
    languages.forEach((language) => submission.append("languages", language));
    if (guideType === "escort") submission.append("pan", pan.trim());
    submission.append("profileImage", profileFile);
    submission.append("identityProofs", licenceFile);
    submission.append("identityProofs", aadhaarFile);
    const result = await dispatch(sendRegistrationOtpThunk(submission));
    setSubmitting(false);
    if (sendRegistrationOtpThunk.fulfilled.match(result)) {
      setPendingRegistrationEmail(normalizedEmail);
      setFormError("");
      toast.success("Verification code sent to your email.");
    } else {
      setFormError((result.payload as string) || "Could not send the verification code.");
    }
  };

  const resendVerificationCode = async () => {
    setSubmitting(true);
    const result = await dispatch(
      sendRegistrationOtpThunk({ email: (email || pendingEmail).trim().toLowerCase() }),
    );
    setSubmitting(false);
    if (sendRegistrationOtpThunk.fulfilled.match(result)) {
      setFormError("");
      toast.success("A new verification code has been sent.");
    } else {
      setFormError((result.payload as string) || "Could not resend the verification code.");
    }
  };

  const verifyEmail = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setFormError("Enter the 6-digit verification code.");
      return;
    }
    setSubmitting(true);
    const result = await dispatch(
      verifyRegistrationOtpThunk({ email: (email || pendingEmail).trim().toLowerCase(), otp }),
    );
    setSubmitting(false);
    if (verifyRegistrationOtpThunk.fulfilled.match(result)) {
      setFormError("");
      setPendingRegistrationEmail(null);
      toast.success("Registration submitted. Your application is pending review.");
      router.push("/dashboard/guide");
    } else {
      setFormError((result.payload as string) || "Invalid or expired verification code.");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    if (otpSent) {
      setFormError("Enter the verification code below to complete registration.");
      return;
    }
    await sendVerificationCode();
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-[32rem] rounded-xl" />
      </div>
    );
  }
  if (isAuthenticated) return null;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Register as a Certified Guide</h1>
          <p className="mt-1 text-sm text-slate-500">
            {`Submit your account details, guide profile, photo and required identity documents together. Verify your email to send your application for review. Once an admin approves it, you get a ${GUIDE_TRIAL_DAYS}-day free trial. After the trial ends, you need a membership of ₹${GUIDE_MEMBERSHIP_FEE} for ${GUIDE_MEMBERSHIP_DAYS} days to stay listed.`}
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <FormSection
              title="Account"
              description="Create your account using your full name and contact details."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    disabled={otpSent || submitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email || pendingEmail}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={otpSent || submitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="mt-2 flex h-11 min-w-0 items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <select
                      id="countryCode"
                      aria-label="Country calling code"
                      value={countryCode}
                      onChange={(event) => setCountryCode(event.target.value)}
                      disabled={otpSent || submitting}
                      className="h-full w-[90px] shrink-0 border-0 bg-transparent px-3 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {COUNTRY_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      disabled={otpSent || submitting}
                      required
                      aria-invalid={!!phoneError}
                      aria-describedby={phoneError ? "phone-error" : undefined}
                      className="h-full min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  {phoneError && (
                    <p id="phone-error" role="alert" className="mt-1 text-sm text-red-600">
                      {phoneError}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="accountPassword">Password</Label>
                  <Input
                    id="accountPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={otpSent || submitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={otpSent || submitting}
                    required
                  />
                </div>
                {!otpSent && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-600">
                      Already registered?{" "}
                      <Link href="/signin" className="font-semibold underline">
                        Sign in
                      </Link>{" "}
                      to continue.
                    </p>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Guide profile"
              description="These profile details are included in your guide application."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={otpSent || submitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guideType">Guide Type</Label>
                  <Select
                    value={guideType}
                    onValueChange={(v) => setGuideType(v as "normal" | "escort")}
                    disabled={otpSent || submitting}
                  >
                    <SelectTrigger id="guideType" className="bg-white">
                      <SelectValue placeholder="Select guide type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal Guide</SelectItem>
                      <SelectItem value="escort">Escort Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {guideType === "escort" && (
                  <div>
                    <Label htmlFor="pan">PAN</Label>
                    <Input
                      id="pan"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      disabled={otpSent || submitting}
                      required
                    />
                  </div>
                )}
                <div className="z-50 bg-white md:col-span-2">
                  <Label>Languages</Label>
                  <MultiSelect
                    className="bg-white"
                    options={LANGUAGE_OPTIONS}
                    selected={languages}
                    onChange={setLanguages}
                    placeholder="Select languages..."
                    disabled={otpSent || submitting}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Photo and documents"
              description="Your profile photo is public. Identity documents are private and visible only to admins."
            >
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FileUploadCard
                    label="Profile photo"
                    kind="image"
                    value={profileFile}
                    onChange={setProfileFile}
                    required
                    disabled={otpSent || submitting}
                    captureSelfie
                  />
                </div>
                <FileUploadCard
                  label="Guide Licence"
                  kind="document"
                  value={licenceFile}
                  onChange={setLicenceFile}
                  required
                  disabled={otpSent || submitting}
                />
                <FileUploadCard
                  label="Aadhaar Card"
                  kind="document"
                  value={aadhaarFile}
                  onChange={setAadhaarFile}
                  required
                  disabled={otpSent || submitting}
                />
              </div>

              <label className="mt-6 flex items-start gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  disabled={otpSent || submitting}
                />
                <span>
                  I confirm the details and documents above are genuine, and I agree to
                  GetMyGuide&apos;s{" "}
                  <Link href="/terms" className="underline">
                    terms
                  </Link>
                  .
                </span>
              </label>
            </FormSection>

            <FormSection
              title="Email verification and submit"
              description="Verify your email to send your application to the admin review queue."
            >
              {otpSent ? (
                <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="registrationOtp">Email verification code</Label>
                    <Input
                      id="registrationOtp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit code"
                    />
                  </div>
                  <Button type="button" disabled={submitting} onClick={verifyEmail}>
                    Verify OTP &amp; Submit Application
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={resendVerificationCode}
                  >
                    Resend Code
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
                  <Button type="submit" disabled={submitting || !guideProfileReady}>
                    {submitting ? "Sending verification code..." : "Submit Registration"}
                  </Button>
                </div>
              )}
              {otpSent && formError && (
                <p role="alert" className="mt-3 text-sm text-red-600">{formError}</p>
              )}
            </FormSection>
          </div>
        </form>
      </div>
    </>
  );
}

// Registration is public; authenticated guides manage allowed profile changes
// from their dashboard instead of editing this registration page.
export default function BecomeGuidePageGuarded() {
  return (
    <RoleGuard allowRoles={["guide", "admin"]} redirectTo="/dashboard/user">
      <BecomeGuidePage />
    </RoleGuard>
  );
}
