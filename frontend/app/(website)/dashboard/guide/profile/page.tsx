// app/dashboard/guide/profile/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
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
import {
  compressImage,
  validateUpload,
  formatBytes,
  IMAGE_ACCEPT,
  DOCUMENT_ACCEPT,
} from "@/lib/fileUpload";

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
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Eye,
  CheckCircle2,
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

// `doc.url` is an API route with no file extension, so the stored mime type is
// the reliable signal; `originalName` covers older rows that never recorded one.
const isPdf = (doc: GuideIdentityDocumentInfo) =>
  doc.mimeType === "application/pdf" ||
  /\.pdf$/i.test(doc.originalName ?? "") ||
  /\.pdf(\?|$)/i.test(doc.url);

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);

  const existing = guideImageUrl(currentUrl);

  useEffect(() => {
    // Revoke the object URL when the pending file changes or on unmount.
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const error = validateUpload(file, "image");
    if (error) {
      toast.error(error);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPending(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearPending = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPending(null);
    setPreviewUrl(null);
  };

  const onSave = async () => {
    if (!pending) return;
    setBusy("save");
    const compressed = await compressImage(pending);
    const result = await dispatch(updateGuideProfilePhoto(compressed));
    setBusy(null);
    if (updateGuideProfilePhoto.fulfilled.match(result)) {
      toast.success("Profile photo updated.");
      clearPending();
    } else {
      toast.error((result.payload as string) || "Failed to upload photo.");
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

  const shown = previewUrl || existing;

  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-slate-300" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={onPick}
        />

        {pending ? (
          <>
            <p className="text-xs text-slate-500">
              Preview of <span className="font-medium text-slate-700">{pending.name}</span> ·{" "}
              {formatBytes(pending.size)}. Save to apply.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onSave} disabled={busy !== null}>
                {busy === "save" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Save Photo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearPending}
                disabled={busy !== null}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              JPG, PNG or WebP, up to 10&nbsp;MB. Large images are compressed
              automatically.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={busy !== null}
              >
                <Upload className="h-4 w-4" />
                {existing ? "Replace Photo" : "Upload Photo"}
              </Button>
              {existing && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={onRemove}
                  disabled={busy !== null}
                >
                  {busy === "remove" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove
                </Button>
              )}
            </div>
          </>
        )}
      </div>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const error = validateUpload(file, "document");
    if (error) {
      toast.error(error);
      return;
    }
    setBusy("upload");
    const prepared = await compressImage(file);
    const result = await dispatch(uploadGuideIdentityDocument({ type, file: prepared }));
    setBusy(null);
    if (uploadGuideIdentityDocument.fulfilled.match(result)) {
      toast.success(`${label} uploaded.`);
    } else {
      toast.error((result.payload as string) || `Failed to upload ${label}.`);
    }
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
        {doc ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-200">
            <CheckCircle2 className="h-3 w-3" /> Uploaded
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Not uploaded
          </span>
        )}
      </div>

      {doc && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 p-2.5">
          {isPdf(doc) ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white ring-1 ring-slate-200">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={documentUrl(doc.url)}
              crossOrigin="use-credentials"
              alt={label}
              className="h-12 w-12 shrink-0 rounded object-cover ring-1 ring-slate-200"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700">
              {doc.originalName || "Document on file"}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatBytes(doc.size)}
              {doc.uploadedAt
                ? ` · ${new Date(doc.uploadedAt).toLocaleDateString("en-IN")}`
                : ""}
            </p>
          </div>
          <a
            href={documentUrl(doc.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </a>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={onPick}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === "upload" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {doc ? "Replace" : "Upload"}
        </Button>
        {doc && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={onDelete}
            disabled={busy !== null}
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        )}
      </div>
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
          description="Upload your Aadhaar card and government-issued tourist guide licence. PDF, JPG, PNG or WebP, up to 10 MB each. Visible only to you and our verification team."
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
