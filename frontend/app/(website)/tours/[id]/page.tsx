// app/tours/[id]/page.tsx
"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { notFound, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

// --- Redux Imports ---
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import {
  fetchPackages,
  fetchPackageById,
  fetchRecommendedPackages,
} from "@/lib/redux/thunks/admin/packageThunks";

import { RecommendedPackagesSlider } from "@/components/RecommendedPackagesSlider";
import { TourImageGallery } from "@/components/ui/TourImageGallery";

type LocaleKey = "en" | "es" | "fr" | "ru" | "de";

// Skeleton Component for Loading State
const TourDetailSkeleton = () => (
  <div className="container max-w-7xl mx-auto px-4 py-12 animate-pulse">
    <div className="mb-8">
      <div className="h-12 bg-gray-300 rounded w-3/4 mb-4"></div>
      <div className="flex items-center gap-6">
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
      </div>
    </div>
    <div className="grid grid-cols-4 grid-rows-2 gap-4 mb-12 h-[60vh]">
      <div className="col-span-4 md:col-span-2 row-span-2 bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
      <div className="hidden md:block bg-gray-300 rounded-xl"></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12">
      <div className="lg:col-span-2">
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-5 bg-gray-300 rounded"></div>
          <div className="h-5 bg-gray-300 rounded"></div>
          <div className="h-5 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>
      <aside className="lg:col-span-1">
        <div className="p-6 bg-gray-200 rounded-xl">
          <div className="h-10 bg-gray-300 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-12 bg-gray-300 rounded w-full mb-6"></div>
          <div className="h-64 bg-gray-300 rounded w-full mb-6"></div>
          <div className="h-14 bg-gray-400 rounded w-full"></div>
        </div>
      </aside>
    </div>
  </div>
);

// Safe HTML sanitization — DOMPurify only runs in the browser
function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") return html; // SSR: skip sanitization
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    // Allow inline style attributes so Tiptap color/highlight/alignment renders correctly
    ADD_ATTR: ["style", "data-color"],
    FORBID_TAGS: ["script", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

export default function TourDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // ── All hooks at the top — before any conditional returns ──
  const { items: packages, recommended, loading } = useSelector(
    (state: RootState) => state.packages,
  );

  // Track whether fetchPackageById has completed for this specific ID.
  // This avoids the shared `loading` state causing premature notFound().
  const [isFetchingById, setIsFetchingById] = useState(true);

  const [range, setRange] = useState<DateRange | undefined>();
  const [numberOfTourists, setNumberOfTourists] = useState(1);

  useEffect(() => {
    setIsFetchingById(true);
    (dispatch(fetchPackageById(params.id)) as any).finally(() => {
      setIsFetchingById(false);
    });
    dispatch(fetchRecommendedPackages({ limit: 8 }));
  }, [dispatch, params.id]);

  useEffect(() => {
    if (packages.length === 0) {
      dispatch(fetchPackages());
    }
  }, [dispatch, packages.length]);

  const { language } = useLanguage();

  const tour = packages.find((p) => p._id === params.id);

  // Resolve translations: active language → English fallback → top-level fallback
  const activeLang = language as LocaleKey;
  const translations = tour?.translations;
  const activeTranslation = translations?.[activeLang];
  const enTranslation = translations?.en;

  const title =
    activeTranslation?.title ?? enTranslation?.title ?? tour?.title ?? "";
  const city =
    activeTranslation?.city ?? enTranslation?.city ?? (tour as any)?.city ?? "";
  const places =
    activeTranslation?.places ?? enTranslation?.places ?? (tour as any)?.places ?? [];

  // Full description: current language → English → nowhere
  const rawDescription =
    activeTranslation?.description ?? enTranslation?.description ?? "";

  const safeDescription = useMemo(
    () => sanitizeHtml(rawDescription),
    [rawDescription],
  );

  // True only when the sanitized HTML has visible text (not just empty tags like <p></p>)
  const hasDescriptionContent = safeDescription.replace(/<[^>]*>/g, "").trim().length > 0;

  const currency = (tour as any)?.baseCurrency ?? "INR";
  const price = tour?.price ?? 0;
  const basePrice = (tour as any)?.basePrice;
  const showSavings = basePrice && basePrice > price;

  // Duration from numberOfDays (backend has no "duration" string)
  const tourDurationDays = tour?.numberOfDays ?? 1;

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat(language, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value),
    [language, currency],
  );

  // Inclusions / Exclusions
  const inclusions: string[] =
    (activeTranslation?.inclusions as string[]) ??
    (enTranslation?.inclusions as string[]) ??
    (tour as any)?.inclusions ??
    [];

  const exclusions: string[] =
    (activeTranslation?.exclusions as string[]) ??
    (enTranslation?.exclusions as string[]) ??
    (tour as any)?.exclusions ??
    [];

  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    if (selectedRange?.from) {
      const start = selectedRange.from;
      const end = new Date(start);
      end.setDate(start.getDate() + tourDurationDays - 1);
      setRange({ from: start, to: end });
    } else {
      setRange(undefined);
    }
  };

  const handleFindGuides = () => {
    if (!range?.from || !range.to) return;
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    router.push(
      `/tours/${params.id}/select-guide?startDate=${fmt(range.from)}&endDate=${fmt(range.to)}&tourists=${numberOfTourists}`,
    );
  };

  // ── Conditional renders AFTER all hooks ──
  // Show skeleton while fetchPackageById is still in-flight
  if (isFetchingById) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <TourDetailSkeleton />
      </div>
    );
  }

  // fetchPackageById completed but no matching package found → 404
  if (!tour) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-2">
            {title}
          </h1>
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {(places as string[]).join(", ")}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {tourDurationDays} {tourDurationDays === 1 ? "Day" : "Days"}
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="my-8">
          <TourImageGallery images={tour.images} title={title} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12">
          <div className="lg:col-span-2">
            {/* Tour Overview / Description */}
            <div className="animate-slide-in-left">
              <h2 className="text-3xl font-bold border-b pb-4 mb-6">
                Tour Overview
              </h2>
              {hasDescriptionContent ? (
                <div
                  className="prose prose-lg max-w-none
                    text-foreground/80 leading-relaxed
                    prose-headings:text-foreground prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                    prose-p:my-3 prose-p:leading-relaxed
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-em:text-foreground/70
                    prose-ul:list-disc prose-ul:pl-6 prose-ul:my-3
                    prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-3
                    prose-li:my-1 prose-li:leading-relaxed
                    prose-hr:border-border prose-hr:my-6
                    prose-mark:px-1 prose-mark:rounded
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                    [&_table]:w-full [&_table]:block [&_thead]:block [&_tbody]:block [&_tr]:block [&_th]:block [&_th]:w-full [&_td]:block [&_td]:w-full"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  No description available.
                </p>
              )}
            </div>

            {/* Inclusions */}
            {inclusions.length > 0 && (
              <div className="mt-12 w-full animate-slide-in-left animate-delay-200">
                <h2 className="text-3xl font-bold border-b pb-4 mb-4">
                  What&apos;s Included
                </h2>
                <ul className="flex flex-col space-y-3 text-lg">
                  {inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exclusions */}
            {exclusions.length > 0 && (
              <div className="mt-10 w-full animate-slide-in-left animate-delay-200">
                <h2 className="text-3xl font-bold border-b pb-4 mb-4">
                  What&apos;s Not Included
                </h2>
                <ul className="flex flex-col space-y-3 text-lg text-muted-foreground">
                  {exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                        ✕
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 p-6 bg-card rounded-xl shadow-lg border animate-slide-in-right animate-delay-200">
              <div className="text-center mb-1">
                <span className="text-4xl font-extrabold text-primary">
                  {formatCurrency(price * numberOfTourists)}
                </span>
                <span className="text-lg text-muted-foreground">/ total</span>
              </div>
              {showSavings && (
                <p className="text-muted-foreground mb-4 text-center">
                  <span className="line-through">
                    {formatCurrency(basePrice * numberOfTourists)}
                  </span>
                  <span className="font-bold text-destructive">
                    {" "}Save {Math.round(((basePrice - price) / basePrice) * 100)}%
                  </span>
                </p>
              )}

              <div className="my-4">
                <Label
                  htmlFor="numberOfTourists"
                  className="text-lg font-bold text-center mb-2 block"
                >
                  How many people?
                </Label>
                <Input
                  id="numberOfTourists"
                  type="number"
                  value={numberOfTourists}
                  onChange={(e) =>
                    setNumberOfTourists(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="text-center h-12 text-base"
                  min="1"
                />
              </div>

              <div className="my-4">
                <h3 className="text-lg font-bold text-center mb-2">
                  Select Your Tour Start Date
                </h3>
                <p className="text-sm text-center text-muted-foreground mb-2">
                  Duration: {tourDurationDays}{" "}
                  {tourDurationDays > 1 ? "Days" : "Day"}
                </p>
                <div className="flex justify-center rounded-lg border">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={handleDateSelect}
                    numberOfMonths={1}
                    disabled={{ before: new Date() }}
                    className="p-0"
                  />
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-white font-bold"
                disabled={!range?.from}
                onClick={handleFindGuides}
              >
                Find Available Guides
              </Button>
            </div>
          </aside>
        </div>

        {/* Recommended */}
        <div className="mt-24 border-t pt-16">
          <RecommendedPackagesSlider
            title="You Might Also Like"
            packages={recommended.filter((p) => p._id !== tour._id)}
            loading={loading === "pending" && recommended.length === 0}
          />
        </div>
      </div>
    </div>
  );
}
