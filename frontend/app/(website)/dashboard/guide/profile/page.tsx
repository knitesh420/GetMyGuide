// app/dashboard/guide/profile/page.tsx
"use client";

import { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  getMyGuideProfile,
  patchMyGuideProfile,
  GuideProfilePatch,
} from "@/lib/redux/thunks/guide/guideThunk";
import { fetchLanguages } from "@/lib/redux/thunks/admin/languageThunks";

import { MultiSelect, Option } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GuidePageHeader, GuidePanel } from "@/components/guide";
import { BadgeInfo, Lock } from "lucide-react";

type GuideType = "normal" | "escort";

/** Titled band inside the profile panel, ruled off from the one above it. */
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

const sameLanguages = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

const GuideProfilePage = () => {
  const dispatch: AppDispatch = useDispatch();

  const { myProfile, loading, error } = useSelector((state: RootState) => state.guide);
  const { languages } = useSelector((state: RootState) => state.admin);

  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [guideType, setGuideType] = useState<GuideType>("normal");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(getMyGuideProfile());
    dispatch(fetchLanguages());
  }, [dispatch]);

  useEffect(() => {
    if (!myProfile) return;
    setPhone(myProfile.mobile || "");
    setCity(myProfile.city || "");
    setGuideType(myProfile.type === "escort" ? "escort" : "normal");
    setSelectedLanguages(myProfile.languages || []);
  }, [myProfile]);

  const registered = !!myProfile?.registrationCompleted;

  // Only the fields that actually moved go in the PATCH body, so an unchanged
  // field is never re-sent and "Save" stays disabled until something differs.
  const patch = useMemo<GuideProfilePatch>(() => {
    if (!myProfile) return {};
    const next: GuideProfilePatch = {};
    if (phone !== (myProfile.mobile || "")) next.phone = phone;
    if (city !== (myProfile.city || "")) next.city = city;
    if (guideType !== (myProfile.type === "escort" ? "escort" : "normal")) {
      next.type = guideType;
    }
    if (!sameLanguages(selectedLanguages, myProfile.languages || [])) {
      next.languages = selectedLanguages;
    }
    return next;
  }, [myProfile, phone, city, guideType, selectedLanguages]);

  const hasChanges = Object.keys(patch).length > 0;

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
    setSaved(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setSaved(false);

    if (!registered) return;
    if (!hasChanges) return;

    if (patch.phone !== undefined && patch.phone.length !== 10) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }
    if (patch.city !== undefined && patch.city.trim().length === 0) {
      setFormError("City cannot be empty.");
      return;
    }
    if (patch.languages !== undefined && patch.languages.length === 0) {
      setFormError("Please select at least one language.");
      return;
    }

    const result = await dispatch(patchMyGuideProfile(patch));
    if (patchMyGuideProfile.fulfilled.match(result)) setSaved(true);
  };

  const languageOptions: Option[] = Array.isArray(languages)
    ? languages.map((lang) => ({ value: lang.languageName, label: lang.languageName }))
    : [];

  if (loading && !myProfile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Editing is meaningless before registration — there is no profile to edit and
  // the backend rejects the PATCH anyway. Send them to the registration form.
  if (myProfile && !registered) {
    return (
      <div className="space-y-4">
        <GuidePageHeader
          title="Guide Profile"
          description="Complete your registration before you can edit your profile."
        />
        <GuidePanel className="p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
              <Lock className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">
                Your profile is locked until you register
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Register as a certified guide to add your city, languages and identity
                documents. After that you can come back here to update your phone,
                location, guide type and languages.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/register-guide">
                <BadgeInfo className="mr-2 h-4 w-4" />
                Complete Registration
              </Link>
            </Button>
          </div>
        </GuidePanel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GuidePageHeader
        title="Edit Profile"
        description="Only your phone, location, guide type and languages can be changed after registration."
      />

      <form onSubmit={handleSubmit}>
        <GuidePanel>
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
            title="Editable Details"
            description="These four fields are the only ones you can change."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={handlePhoneChange}
                />
              </div>
              <div>
                <Label htmlFor="city">Guide Location</Label>
                <Input
                  id="city"
                  name="city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setSaved(false);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="guideType">Guide Type</Label>
                <Select
                  value={guideType}
                  onValueChange={(v) => {
                    setGuideType(v as GuideType);
                    setSaved(false);
                  }}
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
              <div className="z-50 bg-white">
                <Label>Languages</Label>
                <MultiSelect
                  className="bg-white"
                  options={languageOptions}
                  selected={selectedLanguages}
                  onChange={(next) => {
                    setSelectedLanguages(next);
                    setSaved(false);
                  }}
                  placeholder="Select languages..."
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Fixed at Registration"
            description="Contact support if any of these need to change."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" value={myProfile?.pan || "—"} disabled />
              </div>
              <div>
                <Label htmlFor="documents">Identity Documents</Label>
                <Input
                  id="documents"
                  value={`${myProfile?.identityProofs?.length ?? 0} document(s) on file`}
                  disabled
                />
              </div>
            </div>
          </FormSection>

          <div className="flex items-center justify-end gap-4 bg-slate-50 px-6 py-4">
            {(formError || error) && (
              <p className="text-sm text-red-600">{formError || error}</p>
            )}
            {saved && !formError && !error && (
              <p className="text-sm text-green-600">Changes saved.</p>
            )}
            <Button type="submit" disabled={loading || !hasChanges}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </GuidePanel>
      </form>
    </div>
  );
};

export default GuideProfilePage;
