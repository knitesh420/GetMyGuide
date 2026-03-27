export interface TourData {
  id: string; // frontend-generated or backend _id
  name: string;
  description: string;
  location: string;
  images: (File | string)[]; // Files for uploads, URLs from backend
  rating?: number;
  createdAt?: string;
}
