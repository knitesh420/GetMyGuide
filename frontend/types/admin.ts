// types/admin.ts

/**
 * Defines the structure for a location's add-on service.
 */
export interface AddOn {
    name: string;
    price: number;
    description?: string;
  }
  
/**
 * Represents the main structure for a tour location package.
 */

interface PriceTier {
  price: number;
}

export interface AdminLocation {
  _id: string;
  placeName: string;
  description: string;
  image: string;
  pricing: {
    smallGroup: PriceTier;  // 1-5 Persons
    mediumGroup: PriceTier; // 6-14 Persons
    largeGroup: PriceTier;  // 15-40 Persons
  };
  category: string;
  addOns: AddOn[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPlan {
  _id: string;
  title: string;
  duration: string;
  totalPrice: number;
  monthlyPrice: number;
  benefits: string[];
  popular: boolean;
  createdAt?: string; // Timestamps are often returned as ISO strings
  updatedAt?: string;
}

export type CreateSubscriptionPlan = Omit<SubscriptionPlan, '_id' | 'createdAt' | 'updatedAt'>;

export interface LanguageOption {
  _id: string;
  languageName: string;
  pricing: {
    standardGroup: { price: number }; // For 1-14 Persons
    largeGroup: { price: number };    // For 15+ Persons
  };
}

// ✅ UPDATED: The type for creating a new language
export interface CreateLanguageOption {
  languageName: string;
  pricing: {
    standardGroup: { price: number };
    largeGroup: { price: number };
  };
}
  
/**
 * Defines the shape of data required to create a new location,
 * omitting the server-generated '_id'.
 */
export type NewAdminLocation = Omit<AdminLocation, '_id'>;

/**
 * Describes the state structure for the admin slice in the Redux store.
 */
export interface AdminState {
  locations: AdminLocation[];
  // You could add other admin-related state here, e.g., users: User[]
  loading: boolean;
  error: string | null;
}
export interface AddOn {
    name: string;
    price: number;
    description?: string;
  }
  
  export interface AdminLocation {
    _id: string;
    placeName: string;
    description: string;
    image: string;
    pricePerPerson: number;
    category: string;
    addOns: AddOn[];
    isActive: boolean;
  }
  
  // --- Language Types ---
  export interface LanguageOption {
    _id: string;
    languageName: string;
    extraCharge: number;
  }
  
  // --- Package (Tour) Types - Aligned with the package page ---
  export interface AdminPackage {
    _id: string;
    title: string;
    description: string;
    price: number;
    basePrice: number; // Strikethrough price
    duration: string;
    locations: string[]; // Array of location names or IDs
    images: string[];
    isActive: boolean;
    isFeatured: boolean; 
    averageRating?: number; // Optional, likely calculated by backend
    numReviews?: number;    // Optional, likely calculated by backend
  }
  
  /**
   * Type for creating a new Package, omitting server-generated fields.
   */
  export type CreateAdminPackage = Omit<AdminPackage, '_id' | 'averageRating' | 'numReviews'>;
  
  /**
   * Type for creating a new Language, omitting server-generated fields.
   */
  // export type CreateLanguageOption = Omit<LanguageOption, '_id'>;
  
  
  // --- Admin Redux State ---
  export interface AdminState {
    locations: AdminLocation[];
    languages: LanguageOption[];
    packages: AdminPackage[];
    loading: boolean;
    error: string | null;
  }