// Updated to match Package API response
export interface TranslationFields {
  title?: string;
  city?: string;
  places?: string[];
  shortDescription?: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
}

export interface TourData {
  id: string; // Package _id from backend
  title: string; // Fallback title for current locale
  city: string; // Fallback city for current locale
  places: string[]; // Fallback places for current locale
  images: (File | string)[]; // Files for uploads, URLs from backend
  price?: number; // Package price in base currency
  baseCurrency?: string;
  shortDescription?: string; // Fallback short description
  description?: string;
  numberOfPeople?: number; // Number of people
  numberOfDays?: number; // Number of days
  inclusions?: string[];
  exclusions?: string[];
  translations?: {
    en: TranslationFields;
    es?: TranslationFields;
    fr?: TranslationFields;
    ru?: TranslationFields;
    de?: TranslationFields;
  };
  featured?: boolean; // Added - Package API field
  status?: "inactive" | "active"; // Added - Package API field
  createdAt?: string;
  updatedAt?: string;
}
