// Updated to match Package API response
export interface TourData {
  id: string; // Package _id from backend
  title: string; // Changed from "name" to match backend
  city: string; // Changed from "location" to match backend
  places: string[]; // Added - required by Package API
  images: (File | string)[]; // Files for uploads, URLs from backend
  inclusions?: string[]; // Added - Package API field
  exclusions?: string[]; // Added - Package API field
  featured?: boolean; // Added - Package API field
  status?: "inactive" | "active"; // Added - Package API field
  createdAt?: string;
  updatedAt?: string;
}
