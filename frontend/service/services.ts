import { apiService } from "@/lib/service/api";
import { TourData } from "@/app/(website)/services/types/tour";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Define the package type returned from backend
interface PackageResponse {
  id: string;
  title: string;
  city: string;
  places: string[];
  images: string[];
  shortDescription?: string;
  description?: string;
  price?: number;
  numberOfPeople?: number;
  numberOfDays?: number;
  inclusions?: string[];
  exclusions?: string[];
  featured: boolean;
  status: "inactive" | "active";
  createdAt: string;
  updatedAt: string;
}

function buildMediaUrl(img: string): string {
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `${API_BASE_URL}/media/packages/${img}`;
}

function mapPackageToTourData(pkg: PackageResponse): TourData {
  return {
    id: pkg.id,
    title: pkg.title,
    city: pkg.city,
    places: pkg.places,
    images: pkg.images.map(buildMediaUrl),
    price: pkg.price,
    shortDescription: pkg.shortDescription,
    numberOfPeople: pkg.numberOfPeople,
    numberOfDays: pkg.numberOfDays,
    inclusions: pkg.inclusions,
    exclusions: pkg.exclusions,
    featured: pkg.featured,
    status: pkg.status,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

// Fetch packages from backend
export async function getServices(): Promise<TourData[]> {
  try {
    const response: any = await apiService.get("/package");
    const packages = response?.packages || [];
    return packages.map(mapPackageToTourData);
  } catch (err: any) {
    console.error("Error fetching services:", err);
    return [];
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
