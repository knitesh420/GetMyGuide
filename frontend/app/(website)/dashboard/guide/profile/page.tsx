// app/dashboard/guide/profile/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { AppDispatch, RootState } from "@/lib/store";
import {
  getMyGuideProfile,
  patchMyGuideProfile,
  GuideProfilePatch,
  updateGuideProfilePhoto,
  deleteGuideProfilePhoto,
  uploadGuideIdentityDocument,
  deleteGuideIdentityDocument,
} from "@/lib/redux/thunks/guide/guideThunk";
import type {
  GuideIdentityDocumentInfo,
  GuideIdentityDocumentType,
} from "@/lib/data";
import { SUPPORTED_LANGUAGES } from "@/lib/supportedLanguages";
import { guideImageUrl } from "@/lib/images";
import { compressImage } from "@/lib/fileUpload";

import { FileUploadCard } from "@/components/FileUploadCard";
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
import {
  BadgeInfo,
  Lock,
} from "lucide-react";

type GuideType = "normal" | "escort";

// Shared input styling so every field on the page reads as one set: a soft
// slate fill that brightens to white on focus, on-brand focus ring from the
// Input/Select primitives. Editable and read-only fields differ only in fill.
const EDITABLE_INPUT =
  "bg-slate-50 border-slate-200 transition-colors focus-visible:bg-white focus-visible:border-slate-300";
const READONLY_INPUT = "bg-slate-100 border-slate-200 text-slate-500";

/** Titled band inside the profile panel, ruled off from the one above it. */
const FormSection = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="border-b border-slate-200 px-5 py-6 last:border-b-0 sm:px-6">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

/**
 * One labelled form field. Owns the label→input rhythm (space-y-2) so every
 * field on the page shares the exact same gap, and an optional hint that sits
 * between the label and the control — deliberately above the input so it can
 * never be covered by an open dropdown.
 */
const Field = ({
  label,
  htmlFor,
  hint,
  action,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex min-h-5 items-center justify-between gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {action}
    </div>
    {hint && <p className="-mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
    {children}
  </div>
);

const sameLanguages = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/**
 * Identity documents are streamed from the API behind the guide's session, not
 * served from Cloudinary — `doc.url` is a path relative to the API origin. The
 * request has to carry the session cookie, which a top-level navigation does on
 * its own; an <img> needs `crossOrigin="use-credentials"` to do the same.
 */
const documentUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${path}`;

// ---------------------------------------------------------------------------
// Profile photo — upload with a preview-before-save step, replace, and remove.
// ---------------------------------------------------------------------------
function ProfilePhotoSection({
  currentUrl,
}: {
  currentUrl: string;
}) {
  const dispatch: AppDispatch = useDispatch();
  const [pending, setPending] = useState<File | null>(null);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);

  const existing = guideImageUrl(currentUrl);

  const onChange = async (file: File | null) => {
    setPending(file);
    if (!file) return;

    setBusy("save");
    const compressed = await compressImage(file);
    const result = await dispatch(updateGuideProfilePhoto(compressed));
    setBusy(null);
    if (updateGuideProfilePhoto.fulfilled.match(result)) {
      toast.success("Profile photo updated.");
      setPending(null);
    } else {
      toast.error((result.payload as string) || "Failed to upload photo.");
      setPending(null);
    }
  };

  const onRemove = async () => {
    setBusy("remove");
    const result = await dispatch(deleteGuideProfilePhoto());
    setBusy(null);
    if (deleteGuideProfilePhoto.fulfilled.match(result)) {
      toast.success("Profile photo removed.");
    } else {
      toast.error((result.payload as string) || "Failed to remove photo.");
    }
  };

  return (
    <div className="space-y-2">
      <FileUploadCard
        label="Profile photo"
        kind="image"
        value={pending}
        onChange={onChange}
        existingPreviewUrl={existing || undefined}
        existingFileName={existing ? "Current profile photo" : null}
        onRemoveExisting={onRemove}
        disabled={busy !== null}
        captureSelfie
      />
      {busy && (
        <p role="status" className="text-xs text-slate-500">
          {busy === "save" ? "Uploading profile photo…" : "Removing profile photo…"}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One identity document slot — upload/replace/preview/delete.
// ---------------------------------------------------------------------------
function DocumentCard({
  label,
  hint,
  type,
  doc,
}: {
  label: string;
  hint: string;
  type: GuideIdentityDocumentType;
  doc: GuideIdentityDocumentInfo | null;
}) {
  const dispatch: AppDispatch = useDispatch();
  const [pending, setPending] = useState<File | null>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);

  const onChange = async (file: File | null) => {
    setPending(file);
    if (!file) return;

    setBusy("upload");
    const prepared = await compressImage(file);
    const result = await dispatch(uploadGuideIdentityDocument({ type, file: prepared }));
    setBusy(null);
    if (uploadGuideIdentityDocument.fulfilled.match(result)) {
      toast.success(`${label} uploaded.`);
    } else {
      toast.error((result.payload as string) || `Failed to upload ${label}.`);
    }
    setPending(null);
  };

  const onDelete = async () => {
    setBusy("delete");
    const result = await dispatch(deleteGuideIdentityDocument(type));
    setBusy(null);
    if (deleteGuideIdentityDocument.fulfilled.match(result)) {
      toast.success(`${label} removed.`);
    } else {
      toast.error((result.payload as string) || `Failed to remove ${label}.`);
    }
  };

  return (
    <div className="space-y-2">
      <FileUploadCard
        label={label}
        kind="document"
        value={pending}
        onChange={onChange}
        existingFileName={doc?.originalName ?? (doc ? "Document on file" : null)}
        existingFileSize={doc?.size}
        onRemoveExisting={onDelete}
        disabled={busy !== null}
      />
      {doc && (
        <a
          href={documentUrl(doc.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          View current {label}
        </a>
      )}
      {busy && (
        <p role="status" className="text-xs text-slate-500">
          {busy === "upload" ? `Uploading ${label}…` : `Removing ${label}…`}
        </p>
      )}
    </div>
  );
}

const GuideProfilePage = () => {
  const dispatch: AppDispatch = useDispatch();

  const { myProfile, loading, error } = useSelector((state: RootState) => state.guide);

  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [guideType, setGuideType] = useState<GuideType>("normal");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(getMyGuideProfile());
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
    if (patchMyGuideProfile.fulfilled.match(result)) {
      setSaved(true);
      toast.success("Profile updated.");
    }
  };

  // Fixed supported list, plus any language already on the profile that predates
  // the list — so an existing value still renders as a chip and is never lost.
  const languageOptions: Option[] = useMemo(() => {
    const values = new Set<string>(SUPPORTED_LANGUAGES as readonly string[]);
    selectedLanguages.forEach((l) => values.add(l));
    return Array.from(values).map((l) => ({ value: l, label: l }));
  }, [selectedLanguages]);

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

  const documents = myProfile?.identityDocuments;

  return (
    <div className="space-y-4">
      <GuidePageHeader
        title="Edit Profile"
        description="Manage your photo, languages, identity documents and contact details."
      />

      {/* Profile photo — its own panel so uploads are independent of the form. */}
      <GuidePanel>
        <FormSection
          title="Profile Photo"
          description="This is the picture travellers see on your public listing."
        >
          <ProfilePhotoSection currentUrl={myProfile?.profileImage || ""} />
        </FormSection>
      </GuidePanel>

      <form onSubmit={handleSubmit}>
        <GuidePanel>
          <FormSection title="Account" description="Managed by your login — not editable here.">
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
              <Field label="Name" htmlFor="name">
                <Input id="name" value={myProfile?.name || ""} disabled className={READONLY_INPUT} />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={myProfile?.email || ""}
                  disabled
                  className={READONLY_INPUT}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Editable Details"
            description="These four fields are the only ones you can change here."
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
              <Field label="Phone Number" htmlFor="phone">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={handlePhoneChange}
                  className={EDITABLE_INPUT}
                />
              </Field>

              <Field label="Guide Location" htmlFor="city">
                <Input
                  id="city"
                  name="city"
                  placeholder="City you guide in"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setSaved(false);
                  }}
                  className={EDITABLE_INPUT}
                />
              </Field>

              <Field label="Guide Type" htmlFor="guideType">
                <Select
                  value={guideType}
                  onValueChange={(v) => {
                    setGuideType(v as GuideType);
                    setSaved(false);
                  }}
                >
                  <SelectTrigger id="guideType" className={`w-full ${EDITABLE_INPUT}`}>
                    <SelectValue placeholder="Select guide type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal Guide</SelectItem>
                    <SelectItem value="escort">Escort Guide</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Foreign Languages"
                hint="Select every language you speak fluently. Type to search."
                action={
                  selectedLanguages.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLanguages([]);
                        setSaved(false);
                      }}
                      className="shrink-0 text-xs font-medium text-slate-500 transition-colors hover:text-red-600"
                    >
                      Clear all
                    </button>
                  ) : undefined
                }
              >
                <MultiSelect
                  options={languageOptions}
                  selected={selectedLanguages}
                  onChange={(next) => {
                    setSelectedLanguages(next);
                    setSaved(false);
                  }}
                  placeholder="Search and select languages..."
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Fixed at Registration"
            description="Contact support if this needs to change."
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
              <Field label="PAN" htmlFor="pan">
                <Input id="pan" value={myProfile?.pan || "—"} disabled className={READONLY_INPUT} />
              </Field>
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

      {/* Identity documents — independent uploads, own panel. */}
      <GuidePanel>
        <FormSection
          title="Identity Documents"
          description="Upload your Aadhaar card and government-issued tourist guide licence. PDF, JPG or PNG, up to 5 MB each. Visible only to you and our verification team."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DocumentCard
              label="Aadhaar Card"
              hint="Front and back, or a single clear scan."
              type="aadhaar"
              doc={documents?.aadhaar ?? null}
            />
            <DocumentCard
              label="Government-issued Tourist Guide Licence"
              hint="Your official guide licence document."
              type="guideLicence"
              doc={documents?.guideLicence ?? null}
            />
          </div>
        </FormSection>
      </GuidePanel>
    </div>
  );
};

export default GuideProfilePage;
