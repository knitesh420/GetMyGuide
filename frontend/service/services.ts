import { apiService, publicApiService } from "@/lib/service/api";
import { resolvePackageImageUrl } from "@/lib/utils";
import { TourData } from "@/app/(website)/services/types/tour";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Define the package type returned from backend
interface TranslationFields {
  title?: string;
  city?: string;
  places?: string[];
  shortDescription?: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
}

interface PackageResponse {
  id: string;
  title: string;
  city: string;
  places: string[];
  // backend may return either image filenames/urls (string) or objects { url, publicId }
  images: Array<string | { url?: string; publicId?: string }>;
  shortDescription?: string;
  description?: string;
  price?: number;
  baseCurrency?: string;
  numberOfPeople?: number;
  numberOfDays?: number;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
  translations?: {
    en: TranslationFields;
    es?: TranslationFields;
    fr?: TranslationFields;
    ru?: TranslationFields;
    de?: TranslationFields;
  };
  featured: boolean;
  status: "inactive" | "active";
  createdAt: string;
  updatedAt: string;
}

const buildMediaUrl = resolvePackageImageUrl;

function mapPackageToTourData(pkg: PackageResponse): TourData {
  // Top-level title/city/etc. may be undefined from backend (stored in translations).
  // Always fall back to the English translation so these fields are never undefined.
  const en = pkg.translations?.en;
  return {
    id: pkg.id,
    title: pkg.title || en?.title || "",
    city: pkg.city || en?.city || "",
    places: pkg.places?.length ? pkg.places : (en?.places ?? []),
    images: Array.isArray(pkg.images) ? pkg.images.map(buildMediaUrl) : [],
    price: pkg.price,
    baseCurrency: pkg.baseCurrency,
    shortDescription: pkg.shortDescription || en?.shortDescription || "",
    description: pkg.description || en?.description || "",
    numberOfPeople: pkg.numberOfPeople,
    numberOfDays: pkg.numberOfDays,
    inclusions: pkg.inclusions?.length ? pkg.inclusions : (en?.inclusions ?? []),
    exclusions: pkg.exclusions?.length ? pkg.exclusions : (en?.exclusions ?? []),
    highlights: pkg.highlights?.length ? pkg.highlights : (en?.highlights ?? []),
    translations: pkg.translations,
    featured: pkg.featured,
    status: pkg.status,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

// Fetch packages from backend
export async function getServices(): Promise<TourData[]> {
  try {
    const response: any = await publicApiService.get("/package");
    const packages = response?.data || [];
    return packages.map(mapPackageToTourData);
  } catch (err: any) {
    console.error("Error fetching services:", err);
    return [];
  }
}

export async function getServiceById(
  packageId: string,
): Promise<TourData | null> {
  try {
    const response: any = await publicApiService.get(`/package/${packageId}`);
    if (!response?.success || !response?.data) {
      return null;
    }
    return mapPackageToTourData(response.data);
  } catch (err: any) {
    console.error("Error fetching service details:", err);
    return null;
  }
}

// Create a new package (admin only)
export async function createService(formData: FormData): Promise<TourData> {
  try {
    const response = await apiService.post<any>("/package", formData);

    if (!response?.success || !response?.data) {
      throw new Error(response?.message || "Failed to create package");
    }

    return mapPackageToTourData(response.data);
  } catch (err: any) {
    const errorMessage =
      err?.message || "Something went wrong. Please try again.";
    throw new Error(errorMessage);
  }
}