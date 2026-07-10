"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { AppDispatch, RootState } from "@/lib/store";
import {
  confirmGuideMembershipPayment,
  createGuideMembershipOrder,
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

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_THEME_COLOR = "#22C55E";

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
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { myProfile, loading } = useSelector((state: RootState) => state.guide);

  const registered = !!myProfile?.registrationCompleted;

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

  // Registration is account-first now: an anonymous visitor has no Guide record
  // to write to. Sign-in drops guides on their dashboard, where "Complete
  // Profile" leads back here.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) dispatch(getMyGuideProfile());
  }, [dispatch, isAuthenticated]);

  // Prefill from whatever is already on record — the account phone for a new
  // guide, the saved Guide fields for one coming back to edit.
  useEffect(() => {
    if (!myProfile) return;
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
   * First-time registration: write the KYC profile, then take the first 30-day
   * membership payment. The profile is persisted before checkout opens, so a
   * guide who abandons payment keeps their registration and can pay later from
   * the dashboard.
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

    const orderResult = await dispatch(createGuideMembershipOrder());
    if (createGuideMembershipOrder.rejected.match(orderResult)) {
      toast.error(
        "You're registered, but payment could not start. You can pay from your dashboard.",
      );
      router.push("/dashboard/guide/buy-subscription");
      return;
    }

    const { transaction_id, razorpay_options } = orderResult.payload;

    const rzp = new window.Razorpay({
      key: razorpay_options.key,
      amount: razorpay_options.amount,
      currency: razorpay_options.currency,
      name: razorpay_options.name,
      description: razorpay_options.description,
      order_id: razorpay_options.order_id,
      prefill: razorpay_options.prefill,
      theme: { color: RAZORPAY_THEME_COLOR },
      handler: async (response: any) => {
        const confirmed = await dispatch(
          confirmGuideMembershipPayment({
            transaction_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        );

        if (confirmGuideMembershipPayment.fulfilled.match(confirmed)) {
          toast.success("You're registered and listed. Welcome aboard!");
        } else {
          toast.error(
            "Payment succeeded but confirmation failed — please contact support.",
          );
        }
        setSubmitting(false);
        router.push("/dashboard/guide");
      },
    });

    rzp.on("payment.failed", (response: any) => {
      toast.error(
        `Payment failed: ${response.error?.description || "please try again"}`,
      );
      setSubmitting(false);
      router.push("/dashboard/guide/buy-subscription");
    });
    rzp.open();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

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
  // so the file inputs never flash for a guide who has already registered.
  if (authLoading || !isAuthenticated || (loading && !myProfile)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-[32rem] rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {registered ? "Edit Your Guide Profile" : "Register as a Certified Guide"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {registered
              ? "Your phone, city, guide type and languages stay editable. Everything else was fixed at registration."
              : "A one-time registration, followed by your first 30-day membership payment."}
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <FormSection title="Account" description="Managed by your login — not editable here.">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={myProfile?.name || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={myProfile?.email || ""} disabled />
                </div>
              </div>
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
                  />
                </div>
              </div>
            </FormSection>

            {!registered && (
              <FormSection
                title="Photos & Documents"
                description="Your photo is public. Your licence and Aadhaar are private and seen only by admins."
              >
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
              </FormSection>
            )}

            <div className="flex items-center justify-end gap-4 bg-slate-50 px-6 py-4">
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <Button type="submit" disabled={submitting || loading}>
                {submitting
                  ? "Please wait..."
                  : registered
                    ? "Save Changes"
                    : "Register & Pay Membership"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// Guide registration is for guide accounts only. A signed-in tourist is
// redirected to their own dashboard with an "Unauthorized Access" notice, and
// anonymous visitors are sent to sign in (see section 6 role rules).
export default function BecomeGuidePageGuarded() {
  return (
    <RoleGuard
      allowRoles={["guide", "admin"]}
      requireAuth
      redirectTo="/dashboard/user"
    >
      <BecomeGuidePage />
    </RoleGuard>
  );
}
