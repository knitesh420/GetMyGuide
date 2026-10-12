"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { AppDispatch, RootState } from "@/lib/store";
import {
  sendRegistrationOtp as sendRegistrationOtpThunk,
  verifyRegistrationOtp as verifyRegistrationOtpThunk,
} from "@/lib/redux/authSlice";
import {
  getMyGuideProfile,
  patchMyGuideProfile,
  updateMyGuideProfile,
} from "@/lib/redux/thunks/guide/guideThunk";
import { useAuth } from "@/lib/hooks/useAuth";
import RoleGuard from "@/components/auth/RoleGuard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, Option } from "@/components/ui/multi-select";
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

/** Keep a pre-authentication profile draft recoverable within this browser tab. */
const DRAFT_KEY = "guideRegistrationDraft";

interface RegistrationDraft {
  phone: string;
  city: string;
  pan: string;
  guideType: "" | "normal" | "escort";
  languages: string[];
}

function readDraft(): RegistrationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as RegistrationDraft) : null;
  } catch {
    return null;
  }
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

  const { myProfile, loading } = useSelector((state: RootState) => state.guide);

  const registered = !!myProfile?.registrationCompleted;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [pan, setPan] = useState("");
  const [guideType, setGuideType] = useState<"" | "normal" | "escort">("");
  const [languages, setLanguages] = useState<string[]>([]);

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) dispatch(getMyGuideProfile());
  }, [dispatch, isAuthenticated]);

  // Restore anything typed before signing up (see DRAFT_KEY). Runs once, ahead
  // of the profile prefill below, which only fills fields still left empty.
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    sessionStorage.removeItem(DRAFT_KEY);
    setPhone((p) => p || draft.phone);
    setCity((c) => c || draft.city);
    setPan((p) => p || draft.pan);
    setGuideType((t) => t || draft.guideType);
    setLanguages((l) => (l.length ? l : draft.languages));
  }, []);

  // Prefill from whatever is already on record — the account phone for a new
  // guide, the saved Guide fields for one coming back to edit.
  useEffect(() => {
    if (!myProfile) return;
    setName((n) => n || myProfile.name || "");
    setEmail((e) => e || myProfile.email || "");
    setPhone((p) => p || myProfile.mobile || "");
    setCity((c) => c || myProfile.city || "");
    setPan((p) => p || myProfile.pan || "");
    setGuideType((t) => t || myProfile.type || "");
    setLanguages((l) => (l.length ? l : myProfile.languages || []));
  }, [myProfile]);

  const handleProfileFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  /**
   * A registered guide has already paid and already has documents on file, so
   * this form drops to the four fields the PATCH route accepts. Everything else
   * is fixed at registration.
   */
  const submitEdit = async () => {
    const result = await dispatch(
      patchMyGuideProfile({
        phone,
        city,
        type: guideType as "normal" | "escort",
        languages,
      }),
    );

    if (patchMyGuideProfile.fulfilled.match(result)) {
      toast.success("Profile updated.");
      router.push("/dashboard/guide");
    } else {
      setFormError((result.payload as string) || "Could not update your profile.");
    }
    setSubmitting(false);
  };

  /**
   * First-time registration submits the KYC application. Membership starts only
   * after admin approval, when an eligible new guide receives the free trial.
   */
  const submitRegistration = async () => {
    const submission = new FormData();
    submission.append("phone", phone);
    submission.append("city", city);
    submission.append("type", guideType);
    if (guideType === "escort") submission.append("pan", pan);
    languages.forEach((l) => submission.append("languages[]", l));
    submission.append("profileImage", profileFile!);
    submission.append("identityProofs", licenceFile!);
    submission.append("identityProofs", aadhaarFile!);

    const saved = await dispatch(updateMyGuideProfile(submission));
    if (!updateMyGuideProfile.fulfilled.match(saved)) {
      setFormError((saved.payload as string) || "Registration failed.");
      setSubmitting(false);
      return;
    }

    toast.success("Your application has been submitted for review.");
    setSubmitting(false);
    router.push("/dashboard/guide");
  };

  const sendVerificationCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim()) return setFormError("Full name is required.");
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      return setFormError("Please enter a valid email address.");
    }
    if (phone.length !== 10) return setFormError("Phone number must be exactly 10 digits.");
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return setFormError("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
    }
    if (password !== confirmPassword) return setFormError("Passwords do not match.");

    setSubmitting(true);
    const result = await dispatch(
      sendRegistrationOtpThunk({
        name: name.trim(),
        email: normalizedEmail,
        phone,
        countryCode,
        password,
        confirmPassword,
        accountType: "guide",
      }),
    );
    setSubmitting(false);
    if (sendRegistrationOtpThunk.fulfilled.match(result)) {
      setOtpSent(true);
      setFormError("");
      toast.success("Verification code sent to your email.");
    } else {
      setFormError((result.payload as string) || "Could not send the verification code.");
    }
  };

  const verifyEmail = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setFormError("Enter the 6-digit verification code.");
      return;
    }
    setSubmitting(true);
    const result = await dispatch(
      verifyRegistrationOtpThunk({ email: email.trim().toLowerCase(), otp }),
    );
    setSubmitting(false);
    if (verifyRegistrationOtpThunk.fulfilled.match(result)) {
      setFormError("");
      setOtpSent(false);
      setPassword("");
      setConfirmPassword("");
      toast.success("Email verified. Complete and submit your guide application.");
    } else {
      setFormError((result.payload as string) || "Invalid or expired verification code.");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (!isAuthenticated) {
      if (otpSent) {
        setFormError("Verify your email using the code sent to you before submitting.");
        return;
      }
      await sendVerificationCode();
      return;
    }

    if (phone.length !== 10) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }
    if (!city.trim()) {
      setFormError("City is required.");
      return;
    }
    if (!guideType) {
      setFormError("Please select a guide type.");
      return;
    }
    if (guideType === "escort" && !pan.trim()) {
      setFormError("PAN is required for escort guides.");
      return;
    }
    if (languages.length === 0) {
      setFormError("Please select at least one language.");
      return;
    }

    if (!registered) {
      if (!profileFile) {
        setFormError("A profile photo is required to register.");
        return;
      }
      if (!licenceFile) {
        setFormError("Your guide licence is required to register.");
        return;
      }
      if (!aadhaarFile) {
        setFormError("Your Aadhaar document is required to register.");
        return;
      }
      if (!disclaimerAccepted) {
        setFormError("Please accept the disclaimer to proceed.");
        return;
      }
    }

    setSubmitting(true);
    if (registered) await submitEdit();
    else await submitRegistration();
  };

  // Hold the skeleton until we know whether this is a registration or an edit,
  // so the file inputs never flash for a guide who has already registered. An
  // anonymous visitor has no profile to wait on — show them the blank form.
  if (authLoading || (isAuthenticated && loading && !myProfile)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-[32rem] rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {registered ? "Edit Your Guide Profile" : "Register as a Certified Guide"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {registered
              ? "Your phone, city, guide type and languages stay editable. Everything else was fixed at registration."
              : "Create your account, verify your email, and submit your guide profile in one place. Eligible approved guides receive a 40-day free trial."}
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <FormSection
              title="Account"
              description={
                isAuthenticated
                  ? "Managed by your verified guide account."
                  : "Create your guide account and verify your email here."
              }
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={user?.name || name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    disabled={!!isAuthenticated || submitting}
                    required={!isAuthenticated}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={!!isAuthenticated || submitting || otpSent}
                    required={!isAuthenticated}
                  />
                </div>
                {!isAuthenticated && (
                  <>
                    <div>
                      <Label htmlFor="countryCode">Country Code</Label>
                      <Select value={countryCode} onValueChange={setCountryCode} disabled={otpSent || submitting}>
                        <SelectTrigger id="countryCode" className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((item) => (
                            <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={otpSent || submitting}
                        required
                      />
                    </div>
                  </>
                )}
                {!isAuthenticated && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-600">
                      Already registered? <Link href="/signin" className="font-semibold underline">Sign in</Link> to continue.
                    </p>
                  </div>
                )}
              </div>
              {!isAuthenticated && otpSent && (
                <div className="mt-5 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-end">
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
                    Verify Email
                  </Button>
                  <Button type="button" variant="outline" disabled={submitting} onClick={sendVerificationCode}>
                    Resend Code
                  </Button>
                </div>
              )}
            </FormSection>

            <FormSection
              title="Contact & Guide Type"
              description="These stay editable after registration."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    disabled={
                      (!isAuthenticated && otpSent) ||
                      (isAuthenticated && !registered) ||
                      submitting
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guideType">Guide Type</Label>
                  <Select
                    value={guideType}
                    onValueChange={(v) => setGuideType(v as "normal" | "escort")}
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
                      disabled={registered}
                      required={!!isAuthenticated}
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
                  />
                </div>
              </div>
            </FormSection>

            {!registered && (
              <FormSection
                title="Photos & Documents"
                description="Your photo is public. Your licence and Aadhaar are private and seen only by admins."
              >
                {/* A file picked before signing up can't be carried across the
                    signup redirect (a File isn't serialisable), so list the
                    uploads for anonymous visitors instead of collecting ones
                    they'd only have to pick again. */}
                {!isAuthenticated ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                    <li>Profile photo — shown on your public guide listing</li>
                    <li>Guide licence — private, reviewed by admins</li>
                    <li>Aadhaar — private, reviewed by admins</li>
                    <li className="list-none pt-2 text-xs text-slate-500">
                      Verify your email above, then upload these files here.
                    </li>
                  </ul>
                ) : (
                  <>
                    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label className="mb-2 block">Profile Photo (required)</Label>
                        <div className="mt-2 flex items-center gap-4">
                          {profilePreview && (
                            <Image
                              src={profilePreview}
                              alt="Profile preview"
                              width={80}
                              height={80}
                              className="h-20 w-20 rounded-full object-cover"
                            />
                          )}
                          <Input
                            type="file"
                            onChange={handleProfileFileChange}
                            accept="image/*"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="mb-2 block">Guide Licence (required)</Label>
                        <Input
                          type="file"
                          onChange={(e) => setLicenceFile(e.target.files?.[0] ?? null)}
                          accept="image/*,.pdf"
                          required
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">Aadhaar (required)</Label>
                        <Input
                          type="file"
                          onChange={(e) => setAadhaarFile(e.target.files?.[0] ?? null)}
                          accept="image/*,.pdf"
                          required
                        />
                      </div>
                    </div>

                    <label className="mt-6 flex items-start gap-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={disclaimerAccepted}
                        onChange={(e) => setDisclaimerAccepted(e.target.checked)}
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
                  </>
                )}
              </FormSection>
            )}

            <div className="flex items-center justify-end gap-4 bg-slate-50 px-6 py-4">
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <Button type="submit" disabled={submitting || loading || (!isAuthenticated && otpSent)}>
                {submitting
                  ? "Please wait..."
                  : !isAuthenticated
                    ? otpSent
                      ? "Verify email above to continue"
                      : "Send Email Verification Code"
                    : registered
                      ? "Save Changes"
                      : "Submit Guide Application"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// Anonymous visitors may read and fill this form — it's the public "become a
// guide" pitch, and turning them away at the door loses them. They're sent to
// sign up when they submit, which is the first point an account is actually
// needed. A signed-in tourist still can't register as a guide, so they get the
// "Unauthorized Access" notice and a bounce to their own dashboard.
export default function BecomeGuidePageGuarded() {
  return (
    <RoleGuard allowRoles={["guide", "admin"]} redirectTo="/dashboard/user">
      <BecomeGuidePage />
    </RoleGuard>
  );
}
