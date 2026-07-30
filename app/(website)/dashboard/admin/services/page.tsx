"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Package as PackageIcon, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  addPackage,
  deletePackage,
  fetchPackagesForAdmin,
  updatePackage,
} from "@/lib/redux/thunks/admin/packageThunks";
import { AdminPackage } from "@/types/admin";
import { resolvePackageImageUrl } from "@/lib/utils";
import { PageHeader, EmptyState, AdminStatusBadge } from "@/components/admin/ui";
import { SkeletonTable } from "@/components/animations/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Mirrors SUPPORTED_LOCALES in the backend's package validator. */
const LOCALES = ["en", "fr", "de", "es", "ru"] as const;
type Locale = (typeof LOCALES)[number];

const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  ru: "Russian",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** The per-locale half of a package. English is mandatory; the rest optional. */
interface TranslationForm {
  title: string;
  city: string;
  shortDescription: string;
  description: string;
  /** Newline-separated in the form; split into arrays on submit. */
  places: string;
  inclusions: string;
  exclusions: string;
  highlights: string;
}

const emptyTranslation = (): TranslationForm => ({
  title: "",
  city: "",
  shortDescription: "",
  description: "",
  places: "",
  inclusions: "",
  exclusions: "",
  highlights: "",
});

const linesToArray = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const arrayToLines = (value?: string[]) => (value ?? []).join("\n");

/** Hydrate the form from an existing package, falling back to its English copy. */
function toTranslationForm(pkg: AdminPackage, locale: Locale): TranslationForm {
  const source: any =
    (pkg.translations as any)?.[locale] ?? (locale === "en" ? pkg : {});

  return {
    title: source.title ?? "",
    city: source.city ?? "",
    shortDescription: source.shortDescription ?? "",
    description: source.description ?? "",
    places: arrayToLines(source.places),
    inclusions: arrayToLines(source.inclusions),
    exclusions: arrayToLines(source.exclusions),
    highlights: arrayToLines(source.highlights),
  };
}

const isBlank = (t: TranslationForm) =>
  !t.title.trim() && !t.city.trim() && !t.description.trim();

function ServiceDialog({
  pkg,
  open,
  onOpenChange,
}: {
  /** `null` means "create a new service". */
  pkg: AdminPackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const isEditing = Boolean(pkg);

  const [locale, setLocale] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Record<Locale, TranslationForm>>(
    () => Object.fromEntries(LOCALES.map((l) => [l, emptyTranslation()])) as Record<Locale, TranslationForm>,
  );
  const [price, setPrice] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState("1");
  const [numberOfDays, setNumberOfDays] = useState("1");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Refill the form whenever a different service is opened. Keyed off the id so
  // reopening the same row doesn't clobber edits mid-session.
  useEffect(() => {
    if (!open) return;
    setLocale("en");
    setImages([]);

    if (pkg) {
      setTranslations(
        Object.fromEntries(
          LOCALES.map((l) => [l, toTranslationForm(pkg, l)]),
        ) as Record<Locale, TranslationForm>,
      );
      setPrice(String(pkg.price ?? ""));
      setNumberOfPeople(String(pkg.numberOfPeople ?? 1));
      setNumberOfDays(String(pkg.numberOfDays ?? 1));
      setFeatured(Boolean(pkg.featured));
      setStatus(pkg.status === "inactive" ? "inactive" : "active");
    } else {
      setTranslations(
        Object.fromEntries(
          LOCALES.map((l) => [l, emptyTranslation()]),
        ) as Record<Locale, TranslationForm>,
      );
      setPrice("");
      setNumberOfPeople("1");
      setNumberOfDays("1");
      setFeatured(false);
      setStatus("active");
    }
  }, [pkg, open]);

  const current = translations[locale];
  const setField = (field: keyof TranslationForm, value: string) =>
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }));

  const handleSubmit = async () => {
    const english = translations.en;

    // The backend requires a complete English translation on both create and
    // update — validate it here so the admin sees which field is missing rather
    // than a generic 400.
    const missing = (
      [
        ["title", english.title],
        ["city", english.city],
        ["short description", english.shortDescription],
        ["description", english.description],
        ["places", english.places],
        ["inclusions", english.inclusions],
        ["exclusions", english.exclusions],
        ["highlights", english.highlights],
      ] as const
    ).find(([, value]) => !value.trim());

    if (missing) {
      toast.error(`English ${missing[0]} is required.`);
      setLocale("en");
      return;
    }

    const priceValue = Number(price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast.error("Enter a price of zero or more.");
      return;
    }
    if (!isEditing && images.length === 0) {
      toast.error("Add at least one image.");
      return;
    }

    // Only send locales the admin actually filled in; a half-empty French tab
    // would fail the backend's per-locale completeness check.
    const payload: Record<string, unknown> = {};
    for (const l of LOCALES) {
      const t = translations[l];
      if (l !== "en" && isBlank(t)) continue;
      payload[l] = {
        title: t.title.trim(),
        city: t.city.trim(),
        shortDescription: t.shortDescription.trim(),
        description: t.description.trim(),
        places: linesToArray(t.places),
        inclusions: linesToArray(t.inclusions),
        exclusions: linesToArray(t.exclusions),
        highlights: linesToArray(t.highlights),
      };
    }

    const formData = new FormData();
    formData.append("translations", JSON.stringify(payload));
    formData.append("price", String(priceValue));
    formData.append("numberOfPeople", String(Number(numberOfPeople) || 1));
    formData.append("numberOfDays", String(Number(numberOfDays) || 1));
    formData.append("featured", String(featured));
    if (isEditing) formData.append("status", status);
    for (const file of images) formData.append("images", file);

    setSubmitting(true);
    const result = isEditing
      ? await dispatch(updatePackage({ id: pkg!._id, packageData: formData }))
      : await dispatch(addPackage(formData));
    setSubmitting(false);

    const ok = isEditing
      ? updatePackage.fulfilled.match(result)
      : addPackage.fulfilled.match(result);

    if (ok) {
      toast.success(isEditing ? "Service updated." : "Service created.");
      onOpenChange(false);
    } else {
      toast.error(
        (result.payload as string) ||
          `Could not ${isEditing ? "update" : "create"} the service.`,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>
            English is required. The other languages are optional — fill one in
            completely, or leave it blank.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 border-b">
          {LOCALES.map((l) => {
            const filled = l === "en" || !isBlank(translations[l]);
            return (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  locale === l
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {LOCALE_LABEL[l]}
                {filled && l !== "en" && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={current.title}
                onChange={(e) => setField("title", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={current.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Short description</Label>
            <Input
              value={current.shortDescription}
              onChange={(e) => setField("shortDescription", e.target.value)}
              placeholder="One line, shown on the service card"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={current.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["places", "Places"],
                ["highlights", "Highlights"],
                ["inclusions", "Inclusions"],
                ["exclusions", "Exclusions"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <Label>{label}</Label>
                <Textarea
                  rows={4}
                  value={current[field]}
                  onChange={(e) => setField(field, e.target.value)}
                  placeholder="One per line"
                />
              </div>
            ))}
          </div>

          {/* Price, capacity and visibility are properties of the service
              itself, not of any one translation — so they sit outside the
              locale tabs and apply whichever language is selected. */}
          <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>People</Label>
                <Input
                  type="number"
                  min={1}
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Days</Label>
                <Input
                  type="number"
                  min={1}
                  value={numberOfDays}
                  onChange={(e) => setNumberOfDays(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service-images">
                Images {isEditing && "(uploading replaces the current set)"}
              </Label>
              <Input
                id="service-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImages(Array.from(e.target.files ?? []))}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <Switch checked={featured} onCheckedChange={setFeatured} />
                Featured on the homepage
              </label>

              {isEditing && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Switch
                    checked={status === "active"}
                    onCheckedChange={(on) => setStatus(on ? "active" : "inactive")}
                  />
                  Visible on the site
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Create service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminServicesPage() {
  const dispatch = useAppDispatch();
  const { items, loading, currentAction, error } = useAppSelector(
    (state) => state.packages,
  );

  const [editing, setEditing] = useState<AdminPackage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminPackage | null>(null);

  useEffect(() => {
    dispatch(fetchPackagesForAdmin());
  }, [dispatch]);

  const isFetching = loading === "pending" && currentAction === "fetching";

  const activeCount = useMemo(
    () => items.filter((pkg) => pkg.status !== "inactive").length,
    [items],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (pkg: AdminPackage) => {
    setEditing(pkg);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await dispatch(deletePackage(deleting._id));
    setDeleting(null);
    if (deletePackage.fulfilled.match(result)) {
      toast.success("Service deleted.");
    } else {
      toast.error((result.payload as string) || "Could not delete the service.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description={`${items.length} service${items.length === 1 ? "" : "s"}, ${activeCount} live on the site.`}
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New service
        </Button>
      </PageHeader>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {isFetching && items.length === 0 ? (
        <SkeletonTable rows={6} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No services yet"
          description="Create a service to list a tour package on the site."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 text-right font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((pkg) => {
                const title = pkg.title || pkg.translations?.en?.title || "Untitled";
                const city = pkg.city || pkg.translations?.en?.city || "—";
                const isActive = pkg.status !== "inactive";

                return (
                  <tr key={pkg._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {pkg.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolvePackageImageUrl(pkg.images[0])}
                            alt={title}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <PackageIcon className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-slate-900">
                            {title}
                            {pkg.featured && (
                              <Star
                                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                aria-label="Featured"
                              />
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {pkg.numberOfDays ?? 1} day
                            {(pkg.numberOfDays ?? 1) === 1 ? "" : "s"} ·{" "}
                            {pkg.numberOfPeople ?? 1} people
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {city}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                      {currency.format(pkg.price ?? 0)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <AdminStatusBadge
                        status={isActive ? "live" : "hidden"}
                        tone={isActive ? "success" : "neutral"}
                        label={isActive ? "Live" : "Hidden"}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Edit service"
                          onClick={() => openEdit(pkg)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete service"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleting(pkg)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ServiceDialog
        pkg={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleting?.title || deleting?.translations?.en?.title}&rdquo;
              will be removed from the site permanently. Existing bookings are
              not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
