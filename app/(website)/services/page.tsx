"use client";

import { Compass, Trash2, Search, X } from "lucide-react";
import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TourCard from "./_components/TourCard";
import TourForm from "./_components/TourForm";
import type { TourData } from "./types/tour";
import { getServicesAction } from "./actions";
import { useSelector } from "react-redux";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolvePackageImageUrl } from "@/lib/utils";
import { showSuccess, showError, confirmDialog } from "@/lib/swal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}

function ServicesContent() {
  const [packages, setPackages] = useState<TourData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { user, token } = useSelector((state: any) => state.auth);
  const admin = user?.role === "admin";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();

  // Read search query from URL on mount
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  // Reads a string field from the correct locale, falls back to EN then the raw fallback.
  const getLocalizedString = useCallback(
    (pkg: TourData, field: string, _fallback: string): string => {
      const langData = pkg.translations?.[language as keyof typeof pkg.translations] as Record<string, unknown> | undefined;
      const enData   = pkg.translations?.en as Record<string, unknown> | undefined;

      const fromLang = langData?.[field];
      if (typeof fromLang === "string" && fromLang) return fromLang;

      const fromEn = enData?.[field];
      if (typeof fromEn === "string" && fromEn) return fromEn;

      return _fallback || "";
    },
    [language],
  );

  const getLocalizedPlaces = useCallback(
    (pkg: TourData): string[] => {
      const langData = pkg.translations?.[language as keyof typeof pkg.translations];
      const enData   = pkg.translations?.en;
      return langData?.places || enData?.places || pkg.places || [];
    },
    [language],
  );

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return packages;
    const q = searchQuery.toLowerCase().trim();
    return packages.filter((pkg) => {
      const title = getLocalizedString(pkg, "title", pkg.title);
      const city = getLocalizedString(pkg, "city", pkg.city);
      const places = getLocalizedPlaces(pkg);
      return (
        title.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q) ||
        places.some((place) => place.toLowerCase().includes(q))
      );
    });
  }, [packages, searchQuery, language, getLocalizedString, getLocalizedPlaces]);

  const clearSearch = () => {
    setSearchQuery("");
    router.replace("/services", { scroll: false });
  };

  // Ensure component only renders after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch existing packages on mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const services = await getServicesAction();

        // 🔒 Safety: ensure array
        if (Array.isArray(services)) {
          setPackages(services);
        } else {
          setPackages([]);
        }
      } catch (error) {
        console.error("Failed to fetch packages", error);
        setError("Failed to load packages. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);
  const handleSubmit = async (packageData: TourData): Promise<boolean> => {
    try {
      const formData = new FormData();
      if (packageData.price !== undefined)
        formData.append("price", String(packageData.price));
      if (packageData.baseCurrency)
        formData.append("baseCurrency", packageData.baseCurrency);
      if (packageData.numberOfPeople !== undefined)
        formData.append("numberOfPeople", String(packageData.numberOfPeople));
      if (packageData.numberOfDays !== undefined)
        formData.append("numberOfDays", String(packageData.numberOfDays));
      if (packageData.inclusions?.length)
        formData.append("inclusions", JSON.stringify(packageData.inclusions));
      if (packageData.exclusions?.length)
        formData.append("exclusions", JSON.stringify(packageData.exclusions));
      if (packageData.translations) {
        formData.append(
          "translations",
          JSON.stringify(packageData.translations),
        );
      }

      // Append image files
      packageData.images.forEach((img) => {
        if (img instanceof File) {
          formData.append("images", img);
        }
      });

      const res = await fetch(`${API_BASE_URL}/package`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        await showError("Failed to create package", data?.error?.message);
        return false;
      }

      const pkg = data.data || data;

      setPackages((prev) => [
        {
          id: pkg.id || pkg._id,
          title: pkg.translations?.en?.title || pkg.title || "",
          city: pkg.translations?.en?.city || pkg.city || "",
          places: pkg.translations?.en?.places || pkg.places || [],
          images: Array.isArray(pkg.images)
            ? pkg.images.map((img: any) => resolvePackageImageUrl(img))
            : [],
          price: pkg.price,
          baseCurrency: pkg.baseCurrency,
          shortDescription: pkg.translations?.en?.shortDescription || pkg.shortDescription,
          description: pkg.translations?.en?.description || pkg.description,
          numberOfPeople: pkg.numberOfPeople,
          numberOfDays: pkg.numberOfDays,
          inclusions: pkg.translations?.en?.inclusions || pkg.inclusions,
          exclusions: pkg.translations?.en?.exclusions || pkg.exclusions,
          translations: pkg.translations,
          featured: pkg.featured,
          status: pkg.status,
          createdAt: pkg.createdAt,
          updatedAt: pkg.updatedAt,
        },
        ...prev,
      ]);

      void showSuccess("Package created", "Your package is now live.");
      return true;
    } catch (error) {
      console.error("Failed to create package", error);
      await showError("Something went wrong", "An error occurred while creating the package.");
      return false;
    }
  };

  const handleDelete = async (packageId: string) => {
    const confirmed = await confirmDialog({
      title: "Delete this package?",
      text: "This action cannot be undone.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/package/${packageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const responseText = await res.text();

      if (!res.ok) {
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          data = {
            error: { message: responseText || "Failed to delete package" },
          };
        }
        await showError("Failed to delete package", data?.error?.message);
        return;
      }

      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));
      void showSuccess("Package deleted");
    } catch (error) {
      console.error("Failed to delete package", error);
      await showError("Something went wrong", "An error occurred while deleting the package.");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 mt-20">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-4">
        {/* Tour Form */}
        <div className="mb-6">
          {mounted && admin && <TourForm onSubmit={handleSubmit} />}
        </div>

        {/* Packages Grid */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <h2 className="text-3xl font-bold text-slate-800">
              Available Packages
            </h2>
            <span className="px-4 py-2 bg-white rounded-full text-slate-600 font-semibold shadow-sm">
              {filteredPackages.length}{" "}
              {filteredPackages.length === 1 ? "Package" : "Packages"}
            </span>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by city or package name..."
                className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-slate-500">
                Showing results for &quot;{searchQuery}&quot;
              </p>
            )}
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Loading packages...</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
              <Compass className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">
                {searchQuery
                  ? `No packages found for "${searchQuery}"`
                  : "No packages yet. Create your first package above!"}
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="mt-4 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPackages.map((pkg, index) => (
                <div key={pkg.id || index} className="relative h-full">
                  <TourCard
                    id={pkg.id || (pkg as any)._id}
                    title={getLocalizedString(pkg, "title", pkg.title)}
                    city={getLocalizedString(pkg, "city", pkg.city)}
                    images={pkg.images as (File | string)[]}
                    places={getLocalizedPlaces(pkg)}
                    price={pkg.price}
                    shortDescription={getLocalizedString(pkg, "shortDescription", pkg.shortDescription || "")}
                    description={getLocalizedString(pkg, "description", pkg.description || "")}
                    inclusions={
                      (pkg.translations?.[language as keyof typeof pkg.translations]?.inclusions) ||
                      pkg.translations?.en?.inclusions ||
                      pkg.inclusions ||
                      []
                    }
                    exclusions={
                      (pkg.translations?.[language as keyof typeof pkg.translations]?.exclusions) ||
                      pkg.translations?.en?.exclusions ||
                      pkg.exclusions ||
                      []
                    }
                    highlights={
                      (pkg.translations?.[language as keyof typeof pkg.translations]?.highlights) ||
                      pkg.translations?.en?.highlights ||
                      pkg.highlights ||
                      []
                    }
                    numberOfPeople={pkg.numberOfPeople}
                    numberOfDays={pkg.numberOfDays}
                  />

                  {admin && (
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all z-10"
                      title="Delete package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}